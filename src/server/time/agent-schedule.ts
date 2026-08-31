import { formatTimeInParis } from "@/lib/dates";

const SCHEDULE_TOLERANCE_MINUTES = 15;

type ShiftWithEntries = {
  timeEntries: { status: string }[];
};

// Un pointage REJECTED ne compte pas comme "terminé" : l'agent doit pouvoir
// repointer sur cette vacation (startTimeEntry n'a pas de restriction par
// vacation, seulement "un seul OPEN à la fois" côté serveur).
export function shiftState(shift: ShiftWithEntries): "done" | "open" | "upcoming" {
  if (shift.timeEntries.some((entry) => entry.status === "OPEN")) return "open";
  if (shift.timeEntries.some((entry) => entry.status === "SUBMITTED" || entry.status === "VALIDATED")) {
    return "done";
  }
  return "upcoming";
}

type ShiftTimes = { startAt: Date; endAt: Date };

// Compare un instant ponctuel (l'heure de pointage réelle si déjà démarré,
// sinon l'heure actuelle si pas encore démarré) à l'heure de début prévue —
// jamais l'heure "maintenant" contre la fin, sinon le bandeau resterait
// affiché pendant presque toute la vacation à mesure que le temps avance.
export function scheduleWarning(pointedAt: Date, scheduledAt: Date, shift: ShiftTimes): string | null {
  const diffMinutes = Math.abs(pointedAt.getTime() - scheduledAt.getTime()) / 60_000;
  if (diffMinutes <= SCHEDULE_TOLERANCE_MINUTES) return null;
  return `Créneau prévu ${formatTimeInParis(shift.startAt)}–${formatTimeInParis(shift.endAt)} — vous pointez à ${formatTimeInParis(pointedAt)}`;
}
