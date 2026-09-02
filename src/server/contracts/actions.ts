import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { contractInputSchema } from "@/lib/zod/contract";
import { logAudit } from "@/server/audit/log";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

// Cadre legal pur : plus de site/tarif ici (voir src/server/contract-sites
// pour l'ajout de sites sous ce contrat, une fois créé). Pas de check de
// chevauchement à la création : un cadre sans site ne couvre encore rien.
export async function createContract(user: SessionUser, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = contractInputSchema.parse(input);

  const client = await prisma.client.findUniqueOrThrow({ where: { id: data.clientId } });

  const contract = await prisma.contract.create({
    data: {
      clientId: data.clientId,
      reference: data.reference,
      startsOn: data.startsOn,
      endsOn: data.endsOn,
      status: data.status,
      notes: data.notes,
    },
  });
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "CONTRACT_CREATED",
    entityType: "Contract",
    entityId: contract.id,
    summary: `Contrat créé : ${contract.reference} — ${client.legalName}`,
  });
  return contract;
}
