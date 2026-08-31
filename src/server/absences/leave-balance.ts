// Solde de congés (Mo9, audit du 31/08/2026) : seul le "pris" se calcule
// ici (agrégation d'Absence existantes). L'"acquis" est saisi à la main
// (User.paidLeaveBalance) — pas de règle d'accrual devinée : CLAUDE.md
// interdit un moteur de paie, et la règle réelle (CCN propreté, temps
// partiel, report) n'est nulle part dans la spec.

const DAY_MS = 86_400_000;

export type LeaveAbsence = {
  type: string;
  status: string;
  startsOn: Date;
  endsOn: Date;
};

// Jours calendaires (pas ouvrés/ouvrables — cette distinction dépend elle
// aussi de règles conventionnelles non spécifiées, donc pas devinée),
// clippés aux bornes de l'année si l'absence déborde dessus.
export function paidLeaveDaysTaken(absences: LeaveAbsence[], year: number): number {
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year + 1, 0, 1); // exclusif

  let total = 0;
  for (const absence of absences) {
    if (absence.type !== "PAID_LEAVE" || absence.status !== "APPROVED") continue;

    const start = Math.max(absence.startsOn.getTime(), yearStart);
    const endExclusive = Math.min(absence.endsOn.getTime() + DAY_MS, yearEnd);
    if (endExclusive <= start) continue; // absence entièrement hors année

    total += Math.round((endExclusive - start) / DAY_MS);
  }
  return total;
}
