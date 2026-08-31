import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { logAudit } from "./log";

// Integration : la FK AuditLog.actorUserId est en ON DELETE SET NULL — sans
// actorLabel fige a l'ecriture, supprimer le compte de l'acteur effacerait
// retroactivement qui a fait l'action (constate le 31/08/2026 : 100% des
// lignes en base avaient actorUserId NULL apres suppression de comptes de
// test jetables).
describe("logAudit — attribution (intégration DB)", () => {
  const suffix = Date.now();
  const entryIds: string[] = [];

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { id: { in: entryIds } } });
  });

  it("fige un actorLabel lisible à l'écriture", async () => {
    const actor = await prisma.user.create({
      data: {
        email: `test-audit-log-${suffix}@dlproprete.fr`,
        name: "Test Audit",
        firstName: "Jean",
        lastName: "Dupont",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    await logAudit(prisma, {
      actorUserId: actor.id,
      action: "CONTRACT_CREATED",
      entityType: "Contract",
      entityId: `contract-${suffix}`,
      summary: "Contrat créé : test",
    });
    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: `contract-${suffix}` },
    });
    entryIds.push(entry.id);
    expect(entry.actorLabel).toBe(`Jean Dupont · ${actor.email}`);

    // La suppression du compte ne doit pas effacer l'attribution deja ecrite :
    // c'est le bug racine que ce correctif ferme.
    await prisma.user.delete({ where: { id: actor.id } });
    const afterDelete = await prisma.auditLog.findUniqueOrThrow({ where: { id: entry.id } });
    expect(afterDelete.actorUserId).toBeNull(); // ON DELETE SET NULL, inchangé
    expect(afterDelete.actorLabel).toBe(`Jean Dupont · ${actor.email}`); // survit
  });
});
