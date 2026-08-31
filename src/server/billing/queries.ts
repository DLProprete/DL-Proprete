import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { monthRange } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN"] as const;

export async function listInvoices(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.invoice.findMany({
    include: {
      client: { select: { legalName: true } },
      contract: { select: { reference: true } },
      payments: true,
    },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
  });
}

export async function getInvoice(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      contract: { include: { site: true } },
      lines: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paidOn: "asc" } },
    },
  });
}

// Contrôle en lecture seule : heures pointées VALIDATED du mois pour le
// site du contrat — n'entre jamais dans le calcul de la facture (régie au
// prévu, pas au réalisé).
export async function getValidatedHoursForContractMonth(
  user: SessionUser,
  siteId: string,
  year: number,
  month: number,
) {
  requireRole(user, [...MANAGE_ROLES]);
  const { start, end } = monthRange(year, month);

  const entries = await prisma.timeEntry.findMany({
    where: {
      siteId,
      status: "VALIDATED",
      clockInAt: { gte: start, lt: end },
      clockOutAt: { not: null },
    },
  });

  const totalMinutes = entries.reduce(
    (sum, entry) => sum + (entry.clockOutAt!.getTime() - entry.clockInAt.getTime()) / 60_000,
    0,
  );

  return { entryCount: entries.length, totalHours: totalMinutes / 60 };
}
