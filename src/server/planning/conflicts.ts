import { prisma } from "@/lib/prisma";

// Chevauchement de deux instants [aStart, aEnd) et [bStart, bEnd) : bornes
// exclusives, contrairement au chevauchement de contrats (dates
// calendaires). Deux vacations qui s'enchaînent pile à l'heure (fin de
// l'une = début de l'autre) ne sont pas en conflit.
export function timeRangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function hasSchedulingConflict(
  userId: string,
  startAt: Date,
  endAt: Date,
  excludeShiftId?: string,
): Promise<boolean> {
  const activeAssignments = await prisma.assignment.findMany({
    where: {
      userId,
      status: "ASSIGNED",
      ...(excludeShiftId ? { shiftId: { not: excludeShiftId } } : {}),
    },
    select: { shift: { select: { startAt: true, endAt: true } } },
  });
  return activeAssignments.some((assignment) =>
    timeRangesOverlap(assignment.shift.startAt, assignment.shift.endAt, startAt, endAt),
  );
}

// Variante par lot de hasSchedulingConflict : une seule requête pour N
// agents candidats plutôt qu'une par agent (suggestions de remplaçants).
export async function findConflictingUserIds(
  userIds: string[],
  startAt: Date,
  endAt: Date,
): Promise<Set<string>> {
  const activeAssignments = await prisma.assignment.findMany({
    where: { userId: { in: userIds }, status: "ASSIGNED" },
    select: { userId: true, shift: { select: { startAt: true, endAt: true } } },
  });
  const conflicting = new Set<string>();
  for (const assignment of activeAssignments) {
    if (timeRangesOverlap(assignment.shift.startAt, assignment.shift.endAt, startAt, endAt)) {
      conflicting.add(assignment.userId);
    }
  }
  return conflicting;
}
