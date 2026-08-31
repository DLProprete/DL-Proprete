import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "TIME_VALIDATED"
  | "TIME_REJECTED"
  | "CONTRACT_CREATED"
  | "CONTRACT_UPDATED"
  | "CONTRACT_ACTIVATED"
  | "INVOICE_ISSUED"
  | "INVOICE_PAYMENT"
  | "INVOICE_REMINDED"
  | "ABSENCE_APPROVED"
  | "ABSENCE_REJECTED"
  | "AGENT_CREATED"
  | "AGENT_DEACTIVATED"
  | "PASSWORD_RESET"
  | "ASSIGNMENT_CREATED"
  | "ASSIGNMENT_REMOVED";

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
  client: Pick<Prisma.TransactionClient, "auditLog"> | typeof prisma,
  entry: AuditEntry,
): Promise<void> {
  await client.auditLog.create({ data: entry });
}
