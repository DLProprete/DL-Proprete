import { SCHEDULE_TOLERANCE_MINUTES } from "./agent-schedule";

type ReviewEntry = {
  clockInAt: Date;
  clockOutAt: Date | null;
  shift: { startAt: Date } | null;
};

export type ReviewFlags = {
  durationMinutes: number | null;
  /** Écart signé (minutes) entre le pointage réel et le début prévu. Null si pas de vacation liée. */
  startDeviationMinutes: number | null;
  /** Hors planning (pas de vacation liée) ou écart > SCHEDULE_TOLERANCE_MINUTES. */
  isAnomaly: boolean;
};

// Fonctions pures, sans base : c'est ce qui decide quelles lignes remonter
// en evidence sur /time-entries, doit rester testable independamment de
// Prisma. La "duree nulle" citee par l'audit est deja impossible en base
// depuis la contrainte TimeEntry_min_duration (M2) — pas recalculee ici.
export function reviewFlags(entry: ReviewEntry): ReviewFlags {
  const durationMinutes = entry.clockOutAt
    ? (entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 60_000
    : null;

  if (!entry.shift) {
    return { durationMinutes, startDeviationMinutes: null, isAnomaly: true };
  }

  const startDeviationMinutes =
    (entry.clockInAt.getTime() - entry.shift.startAt.getTime()) / 60_000;

  return {
    durationMinutes,
    startDeviationMinutes,
    isAnomaly: Math.abs(startDeviationMinutes) > SCHEDULE_TOLERANCE_MINUTES,
  };
}
