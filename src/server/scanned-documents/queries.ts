import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

// Un PLANNER ne voit jamais les documents marqués sensibles (RH/santé) —
// garde plus stricte que le reste du module, cohérent avec la règle dure
// "pas de diagnostic médical".
export async function listScannedDocuments(user: SessionUser, status?: "PENDING" | "OCR_DONE" | "VALIDATED" | "REJECTED") {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.scannedDocument.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(user.role === "ADMIN" ? {} : { isSensitive: false }),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getScannedDocument(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const document = await prisma.scannedDocument.findUnique({ where: { id } });
  if (document?.isSensitive && user.role !== "ADMIN") return null;
  return document;
}
