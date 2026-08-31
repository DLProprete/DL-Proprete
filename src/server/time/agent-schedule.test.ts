import { describe, expect, it } from "vitest";
import { shiftState, scheduleWarning } from "./agent-schedule";

describe("shiftState", () => {
  it("à venir sans pointage", () => {
    expect(shiftState({ timeEntries: [] })).toBe("upcoming");
  });

  it("en cours si une entrée OPEN existe", () => {
    expect(shiftState({ timeEntries: [{ status: "OPEN" }] })).toBe("open");
  });

  it("terminée si une entrée SUBMITTED ou VALIDATED existe", () => {
    expect(shiftState({ timeEntries: [{ status: "SUBMITTED" }] })).toBe("done");
    expect(shiftState({ timeEntries: [{ status: "VALIDATED" }] })).toBe("done");
  });

  it("un pointage REJECTED seul laisse la vacation repointable (pas 'done')", () => {
    expect(shiftState({ timeEntries: [{ status: "REJECTED" }] })).toBe("upcoming");
  });

  it("un OPEN prime sur un REJECTED précédent", () => {
    expect(shiftState({ timeEntries: [{ status: "REJECTED" }, { status: "OPEN" }] })).toBe("open");
  });
});

describe("scheduleWarning", () => {
  const shift = { startAt: new Date("2026-08-31T06:30:00Z"), endAt: new Date("2026-08-31T08:30:00Z") };

  it("aucun bandeau dans la fenêtre de ±15 min", () => {
    const pointedAt = new Date("2026-08-31T06:40:00Z"); // +10 min
    expect(scheduleWarning(pointedAt, shift.startAt, shift)).toBeNull();
  });

  it("bandeau au-delà de 15 min d'écart, avec l'heure prévue et l'heure de pointage", () => {
    const pointedAt = new Date("2026-08-31T16:13:00Z");
    const message = scheduleWarning(pointedAt, shift.startAt, shift);
    expect(message).toContain("08:30");
    expect(message).toContain("10:30");
    expect(message).toContain("18:13"); // formatTimeInParis ajoute +2h (CEST) sur cette date d'été
  });

  it("reste basé sur l'heure de pointage enregistrée, pas sur l'horloge courante — ne dérive pas au fil de la vacation", () => {
    // Pointage à l'heure : le bandeau ne doit pas réapparaître 30 min plus
    // tard juste parce que "maintenant" s'est éloigné de la fin prévue.
    const onTimeClockIn = new Date("2026-08-31T06:32:00Z");
    expect(scheduleWarning(onTimeClockIn, shift.startAt, shift)).toBeNull();
  });
});
