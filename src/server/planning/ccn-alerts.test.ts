import { describe, expect, it } from "vitest";
import { weeklyCcnAlerts } from "./ccn-alerts";

function shift(id: string, dateISO: string, startISO: string, endISO: string, billableMinutes: number) {
  return {
    id,
    date: new Date(dateISO),
    startAt: new Date(startISO),
    endAt: new Date(endISO),
    billableMinutes,
  };
}

describe("weeklyCcnAlerts", () => {
  it("aucune alerte pour une semaine normale", () => {
    // 4h/jour, repos de 16h entre les deux : au-dessus du seuil "isolée"
    // (3h) et sous tous les autres seuils.
    const shifts = [
      shift("s1", "2031-06-16", "2031-06-16T06:00:00Z", "2031-06-16T10:00:00Z", 240),
      shift("s2", "2031-06-17", "2031-06-17T06:00:00Z", "2031-06-17T10:00:00Z", 240),
    ];
    expect(weeklyCcnAlerts(shifts, 35)).toEqual([]);
  });

  it("vacation > 10h de travail effectif", () => {
    const shifts = [shift("s1", "2031-06-16", "2031-06-16T06:00:00Z", "2031-06-16T17:00:00Z", 601)];
    const alerts = weeklyCcnAlerts(shifts, 35);
    expect(alerts).toContainEqual({ kind: "LONG_SHIFT", date: shifts[0].date, minutes: 601 });
  });

  it("repos < 11h entre deux vacations", () => {
    const shifts = [
      shift("s1", "2031-06-16", "2031-06-16T06:00:00Z", "2031-06-16T14:00:00Z", 480),
      // Reprend le lendemain à 6h : 16h de repos, pas d'alerte.
      shift("s2", "2031-06-17", "2031-06-17T06:00:00Z", "2031-06-17T08:00:00Z", 120),
    ];
    expect(weeklyCcnAlerts(shifts, 35).some((a) => a.kind === "SHORT_REST")).toBe(false);

    const tightShifts = [
      shift("s1", "2031-06-16", "2031-06-16T06:00:00Z", "2031-06-16T20:00:00Z", 600),
      // Reprend le lendemain à 6h : 10h de repos seulement.
      shift("s2", "2031-06-17", "2031-06-17T06:00:00Z", "2031-06-17T08:00:00Z", 120),
    ];
    const alerts = weeklyCcnAlerts(tightShifts, 35);
    expect(alerts.some((a) => a.kind === "SHORT_REST" && a.restMinutes === 600)).toBe(true);
  });

  it("vacation isolée < 3h (temps partiel éclaté)", () => {
    const shifts = [shift("s1", "2031-06-16", "2031-06-16T06:00:00Z", "2031-06-16T08:00:00Z", 90)];
    const alerts = weeklyCcnAlerts(shifts, 35);
    expect(alerts).toContainEqual({ kind: "ISOLATED_SHORT_SHIFT", date: shifts[0].date, minutes: 90 });
  });

  it("une vacation courte n'est PAS isolée si l'agent en a une autre le même jour", () => {
    const shifts = [
      shift("s1", "2031-06-16", "2031-06-16T06:00:00Z", "2031-06-16T07:30:00Z", 90),
      shift("s2", "2031-06-16", "2031-06-16T18:00:00Z", "2031-06-16T19:30:00Z", 90),
    ];
    expect(weeklyCcnAlerts(shifts, 35).some((a) => a.kind === "ISOLATED_SHORT_SHIFT")).toBe(false);
  });

  it("dépassement 35h de référence si l'agent n'a pas de durée hebdo contractuelle", () => {
    const shifts = [shift("s1", "2031-06-16", "2031-06-16T06:00:00Z", "2031-06-16T18:00:00Z", 36 * 60)];
    const alerts = weeklyCcnAlerts(shifts, null);
    expect(alerts).toContainEqual({ kind: "WEEKLY_OVERTIME", weeklyHours: 36, referenceHours: 35 });
  });

  it("dépassement évalué contre la durée hebdo contractuelle de l'agent, pas 35h en dur", () => {
    const shifts = [shift("s1", "2031-06-16", "2031-06-16T06:00:00Z", "2031-06-16T12:00:00Z", 6 * 60)];
    // Temps partiel 5h/semaine : 6h dépasse sa référence, même si < 35h.
    const alerts = weeklyCcnAlerts(shifts, 5);
    expect(alerts).toContainEqual({ kind: "WEEKLY_OVERTIME", weeklyHours: 6, referenceHours: 5 });
  });
});
