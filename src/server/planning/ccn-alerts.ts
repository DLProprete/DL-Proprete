// Alertes CCN (docs/SPEC.md §7) : purement informatives, n'empêchent rien.
// "L'application n'applique pas la paie" — pas de moteur de règles
// conventionnelles complet, juste ces quatre signaux simples.

const MAX_SHIFT_MINUTES = 10 * 60;
const MIN_REST_MINUTES = 11 * 60;
const ISOLATED_SHIFT_MAX_MINUTES = 3 * 60;
const DEFAULT_FULL_TIME_WEEKLY_HOURS = 35;

export type CcnAlert =
  | { kind: "LONG_SHIFT"; date: Date; minutes: number }
  | { kind: "SHORT_REST"; date: Date; restMinutes: number }
  | { kind: "ISOLATED_SHORT_SHIFT"; date: Date; minutes: number }
  | { kind: "WEEKLY_OVERTIME"; weeklyHours: number; referenceHours: number };

export type AlertShift = {
  id: string;
  date: Date;
  startAt: Date;
  endAt: Date;
  billableMinutes: number;
};

// ponytail: repos < 11h évalué uniquement entre vacations de la semaine
// chargée (pas de lecture de la semaine précédente/suivante) — un
// enchaînement à cheval sur une frontière de semaine n'est pas détecté.
// À revoir si ça devient un cas réel gênant.
export function weeklyCcnAlerts(shifts: AlertShift[], weeklyContractHours: number | null): CcnAlert[] {
  const sorted = [...shifts].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const alerts: CcnAlert[] = [];

  for (const shift of sorted) {
    if (shift.billableMinutes > MAX_SHIFT_MINUTES) {
      alerts.push({ kind: "LONG_SHIFT", date: shift.date, minutes: shift.billableMinutes });
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    const restMinutes = (sorted[i].startAt.getTime() - sorted[i - 1].endAt.getTime()) / 60_000;
    if (restMinutes < MIN_REST_MINUTES) {
      alerts.push({ kind: "SHORT_REST", date: sorted[i].date, restMinutes: Math.round(restMinutes) });
    }
  }

  const byDay = new Map<number, AlertShift[]>();
  for (const shift of sorted) {
    const key = shift.date.getTime();
    const list = byDay.get(key) ?? [];
    list.push(shift);
    byDay.set(key, list);
  }
  for (const dayShifts of byDay.values()) {
    if (dayShifts.length === 1 && dayShifts[0].billableMinutes < ISOLATED_SHIFT_MAX_MINUTES) {
      alerts.push({
        kind: "ISOLATED_SHORT_SHIFT",
        date: dayShifts[0].date,
        minutes: dayShifts[0].billableMinutes,
      });
    }
  }

  const weeklyHours = sorted.reduce((sum, shift) => sum + shift.billableMinutes, 0) / 60;
  const referenceHours = weeklyContractHours ?? DEFAULT_FULL_TIME_WEEKLY_HOURS;
  if (weeklyHours > referenceHours) {
    alerts.push({ kind: "WEEKLY_OVERTIME", weeklyHours, referenceHours });
  }

  return alerts;
}

const dayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });

export function describeCcnAlert(alert: CcnAlert): string {
  switch (alert.kind) {
    case "LONG_SHIFT":
      return `${dayFormatter.format(alert.date)} : vacation de ${(alert.minutes / 60).toFixed(1)} h (> 10 h)`;
    case "SHORT_REST":
      return `${dayFormatter.format(alert.date)} : repos de ${(alert.restMinutes / 60).toFixed(1)} h avant (< 11 h)`;
    case "ISOLATED_SHORT_SHIFT":
      return `${dayFormatter.format(alert.date)} : vacation isolée de ${Math.round(alert.minutes)} min (< 3 h, temps partiel éclaté)`;
    case "WEEKLY_OVERTIME":
      return `${alert.weeklyHours.toFixed(1)} h cette semaine (> ${alert.referenceHours} h de référence)`;
  }
}
