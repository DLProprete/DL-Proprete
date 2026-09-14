type ReviewEntry = {
  clockInAt: Date;
  clockOutAt: Date | null;
  shift: { startAt: Date; endAt: Date } | null;
};

export type ReviewFlags = {
  /** Durée planifiée de la vacation si liée à un shift (décision du
   *  12/09 : la paie retient le prévu, pas le mesuré) ; sinon durée
   *  réellement mesurée, seule donnée disponible hors planning. */
  durationMinutes: number | null;
  /** Hors planning (pas de vacation liée) — seul signal d'anomalie
   *  encore pertinent : un pointage lié à un shift ne peut plus dévier
   *  d'une heure d'arrivée qui n'existe plus. */
  isAnomaly: boolean;
};

// Fonction pure, sans base : c'est ce qui decide quelles lignes remonter
// en evidence sur /time-entries, doit rester testable independamment de
// Prisma.
export function reviewFlags(entry: ReviewEntry): ReviewFlags {
  if (!entry.shift) {
    const durationMinutes = entry.clockOutAt
      ? (entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 60_000
      : null;
    return { durationMinutes, isAnomaly: true };
  }

  const durationMinutes = (entry.shift.endAt.getTime() - entry.shift.startAt.getTime()) / 60_000;
  return { durationMinutes, isAnomaly: false };
}
