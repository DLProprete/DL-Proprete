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

// Suivi manuel de la signature (interface web Yousign, hors outil — voir
// docs/SPEC.md) : pas de retour en arrière au MVP, juste NOT_SENT -> SENT
// -> SIGNED (SENT peut être sauté si le contrat est signé sans passer par
// l'envoi tracé ici).
export async function markContractSignatureSent(user: SessionUser, contractId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: { signatureStatus: "SENT", signatureSentAt: new Date() },
  });
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "CONTRACT_SIGNATURE_SENT",
    entityType: "Contract",
    entityId: contract.id,
    summary: `Contrat envoyé à signer : ${contract.reference}`,
  });
  return contract;
}

export async function markContractSignatureSigned(user: SessionUser, contractId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: { signatureStatus: "SIGNED", signedAt: new Date() },
  });
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "CONTRACT_SIGNATURE_SIGNED",
    entityType: "Contract",
    entityId: contract.id,
    summary: `Contrat signé : ${contract.reference}`,
  });
  return contract;
}
