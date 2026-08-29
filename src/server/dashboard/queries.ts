import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { addDays, dateOnlyUTC, daysBetween, parisToday } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN"] as const;

// Vacations non pourvues aujourd'hui ou demain (Europe/Paris).
export async function getUnstaffedShiftsTodayTomorrow(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  const today = parisToday();
  const todayDate = dateOnlyUTC(today.year, today.month, today.day);
  const dayAfterTomorrow = addDays(todayDate, 2);

  return prisma.shift.findMany({
    where: {
      date: { gte: todayDate, lt: dayAfterTomorrow },
      status: { in: ["UNSTAFFED", "PARTIALLY_STAFFED"] },
    },
    include: { site: { select: { name: true } } },
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });
}

// Pointages en cours depuis plus de 12h — a priori un oubli de "Terminer".
export async function getLongOpenTimeEntries(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  return prisma.timeEntry.findMany({
    where: { status: "OPEN", clockInAt: { lt: twelveHoursAgo } },
    include: {
      user: { select: { firstName: true, lastName: true } },
      site: { select: { name: true } },
    },
    orderBy: { clockInAt: "asc" },
  });
}

// Factures émises et pas encore payées (statut ISSUED précisément : dès le
// premier règlement, notre machine à états passe en PARTIALLY_PAID/PAID).
export async function getUnpaidIssuedInvoices(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.invoice.findMany({
    where: { status: "ISSUED" },
    include: { client: { select: { legalName: true } } },
    orderBy: { dueOn: "asc" },
  });
}

// Contrats actifs qui expirent sous leur propre délai de préavis
// (Contract.renewalNoticeDays, 60 jours par défaut — le champ existe déjà
// dans le schéma pour ça, pas de valeur 60 codée en dur ici).
export async function getContractsEndingSoon(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  const today = parisToday();
  const todayDate = dateOnlyUTC(today.year, today.month, today.day);

  const contracts = await prisma.contract.findMany({
    where: { status: "ACTIVE", endsOn: { gte: todayDate } },
    include: { client: { select: { legalName: true } }, site: { select: { name: true } } },
    orderBy: { endsOn: "asc" },
  });

  return contracts.filter((contract) => daysBetween(todayDate, contract.endsOn) <= contract.renewalNoticeDays);
}
