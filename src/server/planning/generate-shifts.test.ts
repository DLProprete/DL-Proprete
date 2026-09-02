import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { generateShifts } from "./generate-shifts";
import { addDays, dateOnlyUTC, parisToday, timeStringToDate } from "@/lib/dates";

// Test d'intégration : le générateur combine fenêtre glissante, jours fériés
// et exceptions en base — pas un prédicat pur. Fixtures créées et nettoyées
// ici, isolées des données de seed.
describe("generateShifts — jours fériés et exceptions (intégration DB)", () => {
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let contractSiteId: string;
  let templateId: string;
  let adminUser: SessionUser;

  const today = parisToday();
  const windowStart = dateOnlyUTC(today.year, today.month, today.day);
  const templateWeekdayDate = addDays(windowStart, 7);
  const weekday = templateWeekdayDate.getUTCDay();
  const templateDayOfWeek = weekday === 0 ? 7 : weekday;

  // W1 : jour normal (référence, pas d'exception) — doit être généré.
  const w1 = templateWeekdayDate;
  // W2 : même jour de semaine, férié — doit être ignoré.
  const w2 = addDays(templateWeekdayDate, 7);
  // W3 : même jour de semaine, férié + EXTRA — EXTRA l'emporte, doit être généré.
  const w3 = addDays(templateWeekdayDate, 14);
  // W4 : même jour de semaine, exception SKIP — doit être ignoré malgré le jour qui correspond.
  const w4 = addDays(templateWeekdayDate, 21);
  // W5 : jour de semaine différent (+2j), exception EXTRA — doit être généré malgré le jour qui ne correspond pas.
  const w5 = addDays(windowStart, 2);

  beforeAll(async () => {
    const suffix = Date.now();
    const client = await prisma.client.create({
      data: { legalName: "Client Test Fériés", billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: {
        clientId: client.id,
        name: "Site Test Fériés",
        address: "1 rue Test",
        city: "Caen",
        postalCode: "14000",
      },
    });
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        reference: `C-TEST-FERIES-${suffix}`,
        startsOn: new Date("2020-01-01"),
        endsOn: new Date("2030-12-31"),
        status: "ACTIVE",
      },
    });
    const contractSite = await prisma.contractSite.create({
      data: {
        contractId: contract.id,
        siteId: site.id,
        hourlyRateHT: 20,
      },
    });
    const template = await prisma.serviceTemplate.create({
      data: {
        contractSiteId: contractSite.id,
        name: "Entretien test fériés",
        daysOfWeek: [templateDayOfWeek],
        startTime: timeStringToDate("08:00"),
        endTime: timeStringToDate("12:00"),
        durationMinutes: 240,
        requiredAgents: 1,
      },
    });
    const adminRow = await prisma.user.create({
      data: {
        email: `test-admin-feries-${suffix}@dlproprete.fr`,
        name: "Admin Test",
        firstName: "Admin",
        lastName: "Test",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    await prisma.holiday.createMany({
      data: [
        { date: w2, name: "Férié test W2", scope: "COMPANY" },
        { date: w3, name: "Férié test W3", scope: "COMPANY" },
      ],
    });
    await prisma.serviceException.createMany({
      data: [
        { serviceTemplateId: template.id, date: w3, type: "EXTRA" },
        { serviceTemplateId: template.id, date: w4, type: "SKIP" },
        { serviceTemplateId: template.id, date: w5, type: "EXTRA" },
      ],
    });

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    contractSiteId = contractSite.id;
    templateId = template.id;
    adminUser = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.shift.deleteMany({ where: { contractSiteId } });
    await prisma.serviceException.deleteMany({ where: { serviceTemplateId: templateId } });
    await prisma.holiday.deleteMany({ where: { date: { in: [w2, w3] } } });
    await prisma.serviceTemplate.delete({ where: { id: templateId } });
    await prisma.contractSite.delete({ where: { id: contractSiteId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  });

  it("applique la priorité générateur : férié, SKIP, EXTRA", async () => {
    await generateShifts(adminUser);

    const shifts = await prisma.shift.findMany({ where: { contractSiteId } });
    const datesGenerated = new Set(shifts.map((s) => s.date.toISOString()));

    expect(datesGenerated.has(w1.toISOString())).toBe(true); // jour normal
    expect(datesGenerated.has(w2.toISOString())).toBe(false); // férié
    expect(datesGenerated.has(w3.toISOString())).toBe(true); // férié mais EXTRA
    expect(datesGenerated.has(w4.toISOString())).toBe(false); // SKIP malgré jour correspondant
    expect(datesGenerated.has(w5.toISOString())).toBe(true); // EXTRA malgré jour non correspondant
  });
});
