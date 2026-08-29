import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { hasSchedulingConflict } from "@/server/planning/conflicts";

// Agents actifs candidats à un remplacement : ni conflit d'horaire sur le
// créneau (même logique qu'une affectation normale), ni déjà en absence
// approuvée ce jour-là.
export async function listReplacementCandidates(user: SessionUser, shiftId: string) {
  requireRole(user, ["ADMIN"]);
  const shift = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
  const agents = await prisma.user.findMany({
    where: { role: "AGENT", isActive: true },
    orderBy: { lastName: "asc" },
  });

  const candidates = [];
  for (const agent of agents) {
    const scheduleConflict = await hasSchedulingConflict(agent.id, shift.startAt, shift.endAt);
    if (scheduleConflict) continue;

    const onApprovedLeave = await prisma.absence.findFirst({
      where: {
        userId: agent.id,
        status: "APPROVED",
        startsOn: { lte: shift.date },
        endsOn: { gte: shift.date },
      },
    });
    if (onApprovedLeave) continue;

    candidates.push(agent);
  }

  return candidates;
}
