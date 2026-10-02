import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { monthsBefore, previewPurge, runPurge } from "./purge";
import { retentionSettingsSchema } from "./settings";

// Intégration : fixtures datées de 2020 (au-delà de toute durée) et d'il y a
// un mois (jamais purgées). Les données de démo, récentes, ne sont pas touchées.
const suffix = Date.now();
const NOW = new Date();
const OLD = new Date("2020-01-15T08:00:00Z");
const RECENT = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
const UPLOADS = path.join(process.cwd(), "uploads");
const file = (dir: string, name: string) => `${dir}/test-purge-${suffix}-${name}`;
const exists = (relative: string) => stat(path.join(UPLOADS, relative)).then(() => true, () => false);

const ids: Record<string, string> = {};
// Durées réglées dans la base locale : mises de côté pour tester les valeurs par défaut.
let savedSettings: { key: string; months: number }[] = [];

describe("monthsBefore", () => {
  it("reste dans le mois visé en fin de mois", () => {
    expect(monthsBefore(new Date("2028-02-29T03:00:00Z"), 12).toISOString()).toBe("2027-02-28T03:00:00.000Z");
    expect(monthsBefore(new Date("2026-08-31T03:00:00Z"), 6).toISOString()).toBe("2026-02-28T03:00:00.000Z");
    expect(monthsBefore(new Date("2026-10-02T03:00:00Z"), 36).toISOString()).toBe("2023-10-02T03:00:00.000Z");
  });
});

describe("purge de conservation (intégration DB + disque)", () => {
  beforeAll(async () => {
    savedSettings = await prisma.retentionSetting.findMany({ select: { key: true, months: true } });
    await prisma.retentionSetting.deleteMany({});
    for (const relative of [file("absences", "old.pdf"), file("absences", "recent.pdf"), file("site-logs", "old.jpg"), file("site-logs", "recent.jpg")]) {
      await mkdir(path.dirname(path.join(UPLOADS, relative)), { recursive: true });
      await writeFile(path.join(UPLOADS, relative), "x");
    }
    // Un « fichier » impossible à supprimer (c'est un dossier) : la ligne doit rester.
    await mkdir(path.join(UPLOADS, file("absences", "stuck.pdf")), { recursive: true });

    const agent = await prisma.user.create({
      data: { email: `test-purge-${suffix}@dlproprete.fr`, name: "Purge", firstName: "Purge", lastName: "Test", role: "AGENT", emailVerified: true },
    });
    const client = await prisma.client.create({ data: { legalName: `Client Test Purge ${suffix}`, billingAddress: "1 rue Test" } });
    const site = await prisma.site.create({ data: { clientId: client.id, name: "Site Test Purge", address: "1 rue Test", city: "Caen", postalCode: "14000" } });
    const contract = await prisma.contract.create({
      data: { clientId: client.id, reference: `C-TEST-PURGE-${suffix}`, startsOn: new Date("2019-01-01"), endsOn: new Date("2030-12-31"), status: "ACTIVE" },
    });
    const contractSite = await prisma.contractSite.create({ data: { contractId: contract.id, siteId: site.id, hourlyRateHT: 20 } });
    const shift = (date: Date) =>
      prisma.shift.create({
        data: { siteId: site.id, contractSiteId: contractSite.id, date, startAt: date, endAt: new Date(date.getTime() + 3600000), requiredAgents: 1, billableMinutes: 60, status: "PLANNED", generatedFromTemplate: false },
      });
    const [oldShift, recentShift] = [await shift(OLD), await shift(RECENT)];
    Object.assign(ids, { agent: agent.id, client: client.id, site: site.id, contract: contract.id, oldShift: oldShift.id, recentShift: recentShift.id });

    ids.oldAssignment = (await prisma.assignment.create({ data: { shiftId: oldShift.id, userId: agent.id, status: "ASSIGNED" } })).id;
    ids.recentAssignment = (await prisma.assignment.create({ data: { shiftId: recentShift.id, userId: agent.id, status: "ASSIGNED" } })).id;
    ids.oldEntry = (await prisma.timeEntry.create({ data: { userId: agent.id, siteId: site.id, clockInAt: OLD } })).id;
    ids.recentEntry = (await prisma.timeEntry.create({ data: { userId: agent.id, siteId: site.id, clockInAt: RECENT } })).id;

    const absence = (endsOn: Date, documentPath: string | null) =>
      prisma.absence.create({ data: { userId: agent.id, type: "SICK", startsOn: endsOn, endsOn, status: "APPROVED", documentPath } });
    ids.oldAbsence = (await absence(OLD, file("absences", "old.pdf"))).id;
    ids.recentAbsence = (await absence(RECENT, file("absences", "recent.pdf"))).id;
    ids.stuckAbsence = (await absence(OLD, file("absences", "stuck.pdf"))).id;

    const log = (createdAt: Date, photoPath: string) =>
      prisma.siteLog.create({ data: { siteId: site.id, userId: agent.id, comment: "test purge", photoPath, createdAt } });
    ids.oldLog = (await log(OLD, file("site-logs", "old.jpg"))).id;
    ids.recentLog = (await log(RECENT, file("site-logs", "recent.jpg"))).id;
    ids.oldCheckIn = (await prisma.agentSiteCheckIn.create({ data: { userId: agent.id, siteId: site.id, authorId: agent.id, occurredOn: OLD, note: "test" } })).id;

    ids.oldProspect = (await prisma.prospect.create({ data: { legalName: `Prospect Test Purge ${suffix}`, updatedAt: OLD } })).id;
    await prisma.quote.create({ data: { prospectId: ids.oldProspect, reference: `D-TEST-PURGE-${suffix}-1`, updatedAt: OLD } });
    ids.revivedProspect = (await prisma.prospect.create({ data: { legalName: `Prospect Test Purge ${suffix} bis`, updatedAt: OLD } })).id;
    await prisma.quote.create({ data: { prospectId: ids.revivedProspect, reference: `D-TEST-PURGE-${suffix}-2`, updatedAt: RECENT } });
    ids.convertedProspect = (await prisma.prospect.create({ data: { legalName: `Prospect Test Purge ${suffix} client`, status: "WON", convertedClientId: client.id, updatedAt: OLD } })).id;
    ids.signedProspect = (await prisma.prospect.create({ data: { legalName: `Prospect Test Purge ${suffix} signé`, updatedAt: OLD } })).id;
    await prisma.quote.create({ data: { prospectId: ids.signedProspect, reference: `D-TEST-PURGE-${suffix}-3`, contractId: contract.id, updatedAt: OLD } });

    const audit = (action: "TIME_VALIDATED" | "SERVER_ERROR" | "RETENTION_UPDATED") =>
      prisma.auditLog.create({ data: { action, entityType: "TestPurge", entityId: "-", summary: "test purge", createdAt: OLD } });
    ids.oldAudit = (await audit("TIME_VALIDATED")).id;
    ids.oldError = (await audit("SERVER_ERROR")).id;
    ids.oldRetentionTrace = (await audit("RETENTION_UPDATED")).id;
    ids.expiredSession = (await prisma.session.create({ data: { token: `test-purge-${suffix}`, userId: agent.id, expiresAt: OLD } })).id;
  });

  afterAll(async () => {
    // Jamais `undefined` dans un filtre deleteMany : Prisma l'ignore et viderait
    // toute la table si le beforeAll s'est arrêté en route.
    const id = (key: string) => ids[key] ?? "__fixture-absente__";
    await prisma.quote.deleteMany({ where: { reference: { startsWith: `D-TEST-PURGE-${suffix}` } } });
    await prisma.prospect.deleteMany({ where: { legalName: { startsWith: `Prospect Test Purge ${suffix}` } } });
    await prisma.siteLog.deleteMany({ where: { siteId: id("site") } });
    await prisma.agentSiteCheckIn.deleteMany({ where: { siteId: id("site") } });
    await prisma.absence.deleteMany({ where: { userId: id("agent") } });
    await prisma.timeEntry.deleteMany({ where: { userId: id("agent") } });
    await prisma.assignment.deleteMany({ where: { userId: id("agent") } });
    await prisma.session.deleteMany({ where: { userId: id("agent") } });
    await prisma.shift.deleteMany({ where: { siteId: id("site") } });
    await prisma.contractSite.deleteMany({ where: { contractId: id("contract") } });
    await prisma.contract.deleteMany({ where: { id: id("contract") } });
    await prisma.site.deleteMany({ where: { id: id("site") } });
    await prisma.client.deleteMany({ where: { id: id("client") } });
    await prisma.user.deleteMany({ where: { id: id("agent") } });
    for (const setting of savedSettings) {
      await prisma.retentionSetting.upsert({ where: { key: setting.key }, update: { months: setting.months }, create: setting });
    }
    await prisma.auditLog.deleteMany({ where: { OR: [{ entityType: "TestPurge" }, { action: "RETENTION_PURGE", createdAt: { gte: NOW } }] } });
    for (const name of ["old.pdf", "recent.pdf", "stuck.pdf"]) await rm(path.join(UPLOADS, file("absences", name)), { recursive: true, force: true });
    for (const name of ["old.jpg", "recent.jpg"]) await rm(path.join(UPLOADS, file("site-logs", name)), { force: true });
  });

  it("l'aperçu compte les éléments échus sans rien supprimer", async () => {
    const counts = await previewPurge(NOW);
    expect(counts.absenceDocuments).toBeGreaterThanOrEqual(2); // old + stuck
    expect(counts.timeEntries).toBeGreaterThanOrEqual(1);
    expect(await prisma.timeEntry.count({ where: { id: ids.oldEntry } })).toBe(1);
  });

  it("supprime l'échu, garde le récent, ne laisse aucun fichier orphelin", async () => {
    const report = await runPurge(NOW);
    const count = async (model: "absence" | "timeEntry" | "assignment" | "siteLog" | "agentSiteCheckIn" | "prospect" | "auditLog" | "session", id: string) =>
      // @ts-expect-error -- accès générique aux délégués Prisma, limité aux modèles listés
      prisma[model].count({ where: { id } });

    // Échus : supprimés (fichiers compris).
    expect(await count("absence", ids.oldAbsence)).toBe(0);
    expect(await exists(file("absences", "old.pdf"))).toBe(false);
    expect(await count("siteLog", ids.oldLog)).toBe(0);
    expect(await exists(file("site-logs", "old.jpg"))).toBe(false);
    expect(await count("timeEntry", ids.oldEntry)).toBe(0);
    expect(await count("assignment", ids.oldAssignment)).toBe(0);
    expect(await count("agentSiteCheckIn", ids.oldCheckIn)).toBe(0);
    expect(await count("prospect", ids.oldProspect)).toBe(0);
    expect(await count("auditLog", ids.oldAudit)).toBe(0);
    expect(await count("auditLog", ids.oldError)).toBe(0);
    expect(await count("session", ids.expiredSession)).toBe(0);

    // Jamais purgés : prospect devenu client, devis signé, trace de conformité.
    expect(await count("prospect", ids.convertedProspect)).toBe(1);
    expect(await count("prospect", ids.signedProspect)).toBe(1);
    expect(await count("auditLog", ids.oldRetentionTrace)).toBe(1);

    // Récents : intacts. Le prospect relancé par un devis récent reste.
    expect(await count("absence", ids.recentAbsence)).toBe(1);
    expect(await exists(file("absences", "recent.pdf"))).toBe(true);
    expect(await count("siteLog", ids.recentLog)).toBe(1);
    expect(await count("timeEntry", ids.recentEntry)).toBe(1);
    expect(await count("assignment", ids.recentAssignment)).toBe(1);
    expect(await count("prospect", ids.revivedProspect)).toBe(1);
    expect(await prisma.shift.count({ where: { id: ids.oldShift } })).toBe(1); // vacation conservée, sans nom

    // Fichier impossible à supprimer : la ligne et son chemin restent, signalés.
    const stuck = await prisma.absence.findUnique({ where: { id: ids.stuckAbsence } });
    expect(stuck?.documentPath).toBe(file("absences", "stuck.pdf"));
    expect(report.fileErrors).toBeGreaterThanOrEqual(1);

    const summary = await prisma.auditLog.findFirst({ where: { action: "RETENTION_PURGE" }, orderBy: { createdAt: "desc" } });
    expect(summary?.actorLabel).toBe("Tâche planifiée");
  });

  it("refuse une durée sous le plancher légal", () => {
    const valid = { absenceDocuments: "12", absences: "36", timeTracking: "36", siteLogPhotos: "12", siteLogs: "36", prospects: "36", activityLogs: "60", errorLogs: "12" };
    expect(retentionSettingsSchema.safeParse(valid).success).toBe(true);
    expect(retentionSettingsSchema.safeParse({ ...valid, timeTracking: "11" }).success).toBe(false);
    expect(retentionSettingsSchema.safeParse({ ...valid, errorLogs: "3" }).success).toBe(false);
    expect(retentionSettingsSchema.safeParse({ ...valid, absences: "1.5" }).success).toBe(false);
    expect(retentionSettingsSchema.safeParse({ ...valid, prospects: "" }).success).toBe(false); // vide ≠ 0
    expect(retentionSettingsSchema.safeParse({ ...valid, siteLogs: "0" }).success).toBe(false);
  });
});
