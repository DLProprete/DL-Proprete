import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "TIME_VALIDATED"
  | "TIME_REJECTED"
  | "CONTRACT_CREATED"
  | "CONTRACT_UPDATED"
  | "CONTRACT_ACTIVATED"
  | "CONTRACT_SITE_CREATED"
  | "INVOICE_ISSUED"
  | "INVOICE_PAYMENT"
  | "INVOICE_REMINDED"
  | "ABSENCE_APPROVED"
  | "ABSENCE_REJECTED"
  | "AGENT_CREATED"
  | "AGENT_DEACTIVATED"
  | "PASSWORD_RESET"
  | "ASSIGNMENT_CREATED"
  | "ASSIGNMENT_REMOVED"
  | "INVOICE_CREATED";

type AuditEntry = {
  actorUserId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
};

// Frontière : ne jamais passer de mot de passe ni de contenu de justificatif
// dans summary/metadata (règle dure CLAUDE.md).
// `client` accepte prisma ou un tx pour loguer dans la même transaction que
// la mutation qu'il décrit (émission de facture, approbation d'absence).
export async function logAudit(
  client: Pick<Prisma.TransactionClient, "auditLog" | "user"> | typeof prisma,
  entry: AuditEntry,
): Promise<void> {
  // actorLabel fige l'identite de l'acteur au moment de l'ecriture : la FK
  // actorUserId est en ON DELETE SET NULL, donc supprimer le compte plus
  // tard (fixture de test jetable, depart d'un salarie) ne doit pas rendre
  // l'historique deja ecrit anonyme.
  const actor = await client.user.findUnique({
    where: { id: entry.actorUserId },
    select: { firstName: true, lastName: true, email: true },
  });
  const actorLabel = actor ? `${actor.firstName} ${actor.lastName} · ${actor.email}` : null;

  await client.auditLog.create({ data: { ...entry, actorLabel } });
}
