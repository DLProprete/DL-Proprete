import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { addDays, dateOnlyUTC, daysBetween, parisToday } from "@/lib/dates";
import { agentConstraintViolation } from "@/server/planning/agent-constraints";
import { findConflictingUserIds } from "@/server/planning/conflicts";

const MANAGE_ROLES = ["ADMIN"] as const;
const MAX_SUGGESTIONS = 3;

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

// Jusqu'à 3 agents actifs compatibles (contraintes + pas de chevauchement +
// pas d'absence approuvée ce jour-là) pour une vacation non pourvue — pas
// de notion de proximité géographique (pas d'appel Google Maps, pas
// d'itinéraire inventé).
export async function suggestAgentsForShift(user: SessionUser, shiftId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const shift = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
  const agents = await prisma.user.findMany({
    where: { role: "AGENT", isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // Une seule requête pour tous les candidats plutôt qu'une par agent dans
  // la boucle : les absences ne dépendent que du jour de la vacation, pas
  // de l'agent testé.
  const absentAgentIds = new Set(
    (
      await prisma.absence.findMany({
        where: {
          userId: { in: agents.map((agent) => agent.id) },
          status: "APPROVED",
          startsOn: { lte: shift.date },
          endsOn: { gte: shift.date },
        },
        select: { userId: true },
      })
    ).map((absence) => absence.userId),
  );

  // Une seule requête pour tous les candidats plutôt qu'une par agent dans
  // la boucle (idem absences ci-dessus) : hasSchedulingConflict ferait un
  // aller-retour DB par agent testé.
  const conflictingAgentIds = await findConflictingUserIds(
    agents.map((agent) => agent.id),
    shift.startAt,
    shift.endAt,
  );

  const suggestions: { id: string; firstName: string; lastName: string }[] = [];
  for (const agent of agents) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    if (absentAgentIds.has(agent.id)) continue;
    if (agentConstraintViolation(agent, shift)) continue;
    if (conflictingAgentIds.has(agent.id)) continue;
    suggestions.push({ id: agent.id, firstName: agent.firstName, lastName: agent.lastName });
  }
  return suggestions;
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
    include: {
      client: { select: { legalName: true } },
      contractSites: { include: { site: { select: { name: true } } } },
    },
    orderBy: { endsOn: "asc" },
  });

  return contracts.filter((contract) => daysBetween(todayDate, contract.endsOn) <= contract.renewalNoticeDays);
}
