import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { agentConstraintViolation } from "./agent-constraints";
import { timeRangesOverlap } from "./conflicts";
import { haversineKm } from "@/lib/geo";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export type DraftCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  experienceLevel: "JUNIOR" | "CONFIRMED" | "SENIOR" | null;
  distanceKm: number | null;
};

export type DraftShiftProposal = {
  shiftId: string;
  siteName: string;
  date: Date;
  startAt: Date;
  endAt: Date;
  // Un élément par créneau manquant : proposition par défaut (ou null si
  // aucun candidat éligible) + le reste des agents encore éligibles pour
  // un choix manuel côté écran.
  slots: Array<{ proposed: DraftCandidate | null; alternatives: DraftCandidate[] }>;
};

type Interval = { startAt: Date; endAt: Date };

// Génère une proposition d'affectations pour les vacations non/partiellement
// pourvues d'une période — lecture seule, aucune écriture. La validation
// (création réelle des Assignment) passe par assignAgent
// (src/server/planning/assignments.ts), qui revérifie tout à l'instant de
// la confirmation : cette fonction ne fait que proposer un ordre plausible,
// jamais une décision finale.
export async function generateDraftAssignments(
  user: SessionUser,
  from: Date,
  to: Date,
): Promise<DraftShiftProposal[]> {
  requireRole(user, [...MANAGE_ROLES]);

  const shifts = await prisma.shift.findMany({
    where: { date: { gte: from, lte: to }, status: { in: ["UNSTAFFED", "PARTIALLY_STAFFED"] } },
    include: {
      site: { select: { name: true, lat: true, lng: true } },
      assignments: { where: { status: "ASSIGNED" } },
    },
    orderBy: { startAt: "asc" },
  });

  const agents = await prisma.user.findMany({
    where: { role: "AGENT", isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const agentIds = agents.map((agent) => agent.id);

  // Une requête pour toute la période plutôt qu'une par vacation (même
  // esprit que suggestAgentsForShift, src/server/dashboard/queries.ts).
  const absences = await prisma.absence.findMany({
    where: { userId: { in: agentIds }, status: "APPROVED", startsOn: { lte: to }, endsOn: { gte: from } },
    select: { userId: true, startsOn: true, endsOn: true },
  });

  // Affectations réelles déjà en base pour tous les agents actifs — une
  // seule requête, comparée en mémoire plutôt qu'un aller-retour DB par
  // vacation (findConflictingUserIds ferait ça, adapté à un usage
  // ponctuel, pas à un lot de dizaines de vacations).
  const realAssignments = await prisma.assignment.findMany({
    where: { userId: { in: agentIds }, status: "ASSIGNED" },
    select: { userId: true, shift: { select: { startAt: true, endAt: true } } },
  });
  const realIntervalsByAgent = new Map<string, Interval[]>();
  for (const assignment of realAssignments) {
    const list = realIntervalsByAgent.get(assignment.userId) ?? [];
    list.push(assignment.shift);
    realIntervalsByAgent.set(assignment.userId, list);
  }

  // Suivi du lot en cours de construction, pas encore en base : sans ça,
  // deux vacations qui se chevauchent dans ce même lot pourraient proposer
  // le même agent aux deux, puisqu'aucune des deux n'est encore écrite.
  const draftIntervalsByAgent = new Map<string, Interval[]>();
  const draftMinutesByAgent = new Map<string, number>();
  const draftExperienceByShift = new Map<string, Set<string>>();

  const isAbsent = (agentId: string, date: Date) =>
    absences.some((absence) => absence.userId === agentId && absence.startsOn <= date && absence.endsOn >= date);

  const hasConflict = (agentId: string, startAt: Date, endAt: Date) => {
    const intervals = [
      ...(realIntervalsByAgent.get(agentId) ?? []),
      ...(draftIntervalsByAgent.get(agentId) ?? []),
    ];
    return intervals.some((interval) => timeRangesOverlap(interval.startAt, interval.endAt, startAt, endAt));
  };

  const proposals: DraftShiftProposal[] = [];

  for (const shift of shifts) {
    const missingSlots = shift.requiredAgents - shift.assignments.length;
    if (missingSlots <= 0) continue;

    const chosenForThisShift = new Set<string>();
    const slots: DraftShiftProposal["slots"] = [];

    for (let slot = 0; slot < missingSlots; slot++) {
      const alreadyPickedLevels = draftExperienceByShift.get(shift.id) ?? new Set<string>();

      const eligible = agents.filter(
        (agent) =>
          !chosenForThisShift.has(agent.id) &&
          !isAbsent(agent.id, shift.date) &&
          !agentConstraintViolation(agent, shift) &&
          !hasConflict(agent.id, shift.startAt, shift.endAt),
      );

      const scored = eligible.map((agent) => {
        const distanceKm =
          shift.site.lat != null && shift.site.lng != null && agent.homeLat != null && agent.homeLng != null
            ? haversineKm({ lat: shift.site.lat, lng: shift.site.lng }, { lat: agent.homeLat, lng: agent.homeLng })
            : null;
        const minutesSoFar = draftMinutesByAgent.get(agent.id) ?? 0;
        // Bonus léger (jamais bloquant) si cet agent diversifie le niveau
        // d'expérience déjà retenu sur cette même vacation — aide au
        // binôme expérimenté/débutant sans jamais empêcher une proposition.
        const diversityBonus =
          alreadyPickedLevels.size > 0 && agent.experienceLevel && !alreadyPickedLevels.has(agent.experienceLevel)
            ? -1
            : 0;
        return { agent, distanceKm, minutesSoFar, diversityBonus };
      });

      scored.sort((a, b) => {
        if (a.diversityBonus !== b.diversityBonus) return a.diversityBonus - b.diversityBonus;
        if (a.distanceKm == null && b.distanceKm == null) return a.minutesSoFar - b.minutesSoFar;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
        return a.minutesSoFar - b.minutesSoFar;
      });

      const candidates: DraftCandidate[] = scored.map(({ agent, distanceKm }) => ({
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        experienceLevel: agent.experienceLevel,
        distanceKm,
      }));

      const [proposed, ...alternatives] = candidates;
      slots.push({ proposed: proposed ?? null, alternatives });

      if (proposed) {
        chosenForThisShift.add(proposed.id);
        const list = draftIntervalsByAgent.get(proposed.id) ?? [];
        list.push({ startAt: shift.startAt, endAt: shift.endAt });
        draftIntervalsByAgent.set(proposed.id, list);
        const minutes = (shift.endAt.getTime() - shift.startAt.getTime()) / 60_000;
        draftMinutesByAgent.set(proposed.id, (draftMinutesByAgent.get(proposed.id) ?? 0) + minutes);
        if (proposed.experienceLevel) {
          const levels = draftExperienceByShift.get(shift.id) ?? new Set<string>();
          levels.add(proposed.experienceLevel);
          draftExperienceByShift.set(shift.id, levels);
        }
      }
    }

    proposals.push({
      shiftId: shift.id,
      siteName: shift.site.name,
      date: shift.date,
      startAt: shift.startAt,
      endAt: shift.endAt,
      slots,
    });
  }

  return proposals;
}
