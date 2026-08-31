import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { listActors, listAuditLogs } from "./queries";

function user(role: SessionUser["role"]): SessionUser {
  return { id: "u1", email: "u1@dlproprete.fr", role, isActive: true };
}

describe("droits Audit — ADMIN uniquement", () => {
  it("listAuditLogs rejette un PLANNER", async () => {
    await expect(listAuditLogs(user("PLANNER"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listAuditLogs rejette un AGENT", async () => {
    await expect(listAuditLogs(user("AGENT"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listActors rejette un PLANNER", async () => {
    await expect(listActors(user("PLANNER"))).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("filtre « Masquer les données de test » (intégration DB)", () => {
  const suffix = Date.now();
  const from = new Date();
  let normalId: string;
  let testId: string;

  beforeAll(async () => {
    const normal = await prisma.auditLog.create({
      data: {
        action: "CONTRACT_CREATED",
        entityType: "Contract",
        entityId: `contract-${suffix}`,
        summary: `Contrat créé : C-${suffix} — Site Normal`,
      },
    });
    const testEntry = await prisma.auditLog.create({
      data: {
        action: "CONTRACT_CREATED",
        entityType: "Contract",
        entityId: `contract-test-${suffix}`,
        summary: `Contrat créé : C-TEST-${suffix} — Client Test`,
      },
    });
    normalId = normal.id;
    testId = testEntry.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { id: { in: [normalId, testId] } } });
  });

  it("exclut les entrées dont le résumé contient « Test » quand hideTestData est actif", async () => {
    const admin = user("ADMIN");

    const withTest = await listAuditLogs(admin, { from });
    expect(withTest.items.map((item) => item.id)).toContain(testId);
    expect(withTest.items.map((item) => item.id)).toContain(normalId);

    const withoutTest = await listAuditLogs(admin, { from, hideTestData: true });
    expect(withoutTest.items.map((item) => item.id)).not.toContain(testId);
    expect(withoutTest.items.map((item) => item.id)).toContain(normalId);
  });
});
