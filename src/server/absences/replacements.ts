import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { findConflictingUserIds } from "@/server/planning/conflicts";

type ShiftForReplacement = { id: string; date: Date; startAt: Date; endAt: Date };

// Agents actifs candidats à un remplacement : ni conflit d'horaire sur le
// créneau (même logique qu'une affectation normale), ni déjà en absence
// approuvée ce jour-là. Le shift est passé par l'appelant (déjà chargé pour
// lister les vacations à remplacer) plutôt que rechargé ici.
export async function listReplacementCandidates(user: SessionUser, shift: ShiftForReplacement) {
  requireRole(user, ["ADMIN"]);
  const agents = await prisma.user.findMany({
    where: { role: "AGENT", isActive: true },
    orderBy: { lastName: "asc" },
  });
  const agentIds = agents.map((agent) => agent.id);

  // Deux requêtes au total pour tous les candidats plutôt que deux par
  // agent dans la boucle (conflit d'horaire + absence approuvée).
  const [conflictingAgentIds, agentsOnApprovedLeave] = await Promise.all([
    findConflictingUserIds(agentIds, shift.startAt, shift.endAt),
    prisma.absence.findMany({
      where: {
        userId: { in: agentIds },
        status: "APPROVED",
        startsOn: { lte: shift.date },
        endsOn: { gte: shift.date },
      },
      select: { userId: true },
    }),
  ]);
  const onLeaveAgentIds = new Set(agentsOnApprovedLeave.map((absence) => absence.userId));

  return agents.filter(
    (agent) => !conflictingAgentIds.has(agent.id) && !onLeaveAgentIds.has(agent.id),
  );
}
