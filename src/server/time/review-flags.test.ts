import { describe, expect, it } from "vitest";
import { reviewFlags } from "./review-flags";

describe("reviewFlags", () => {
  const shift = { startAt: new Date("2026-08-31T06:30:00Z") };

  it("cas normal : ponctuel, pas d'anomalie", () => {
    const flags = reviewFlags({
      clockInAt: new Date("2026-08-31T06:35:00Z"), // +5 min
      clockOutAt: new Date("2026-08-31T08:35:00Z"),
      shift,
    });
    expect(flags.durationMinutes).toBe(120);
    expect(flags.startDeviationMinutes).toBe(5);
    expect(flags.isAnomaly).toBe(false);
  });

  it("hors planning (pas de vacation liée) : toujours anomalie", () => {
    const flags = reviewFlags({
      clockInAt: new Date("2026-08-31T06:30:00Z"),
      clockOutAt: new Date("2026-08-31T08:30:00Z"),
      shift: null,
    });
    expect(flags.isAnomaly).toBe(true);
    expect(flags.startDeviationMinutes).toBeNull();
  });

  it("écart de 15 min pile : pas encore une anomalie", () => {
    const flags = reviewFlags({
      clockInAt: new Date("2026-08-31T06:45:00Z"), // +15 min
      clockOutAt: new Date("2026-08-31T08:45:00Z"),
      shift,
    });
    expect(flags.isAnomaly).toBe(false);
  });

  it("écart de 16 min : anomalie", () => {
    const flags = reviewFlags({
      clockInAt: new Date("2026-08-31T06:46:00Z"), // +16 min
      clockOutAt: new Date("2026-08-31T08:46:00Z"),
      shift,
    });
    expect(flags.isAnomaly).toBe(true);
    expect(flags.startDeviationMinutes).toBe(16);
  });

  it("écart négatif (pointage en avance) : valeur absolue prise en compte", () => {
    const flags = reviewFlags({
      clockInAt: new Date("2026-08-31T06:10:00Z"), // -20 min
      clockOutAt: new Date("2026-08-31T08:10:00Z"),
      shift,
    });
    expect(flags.startDeviationMinutes).toBe(-20);
    expect(flags.isAnomaly).toBe(true);
  });

  it("pointage encore ouvert (pas de clockOutAt) : durée null, pas de crash", () => {
    const flags = reviewFlags({
      clockInAt: new Date("2026-08-31T06:30:00Z"),
      clockOutAt: null,
      shift,
    });
    expect(flags.durationMinutes).toBeNull();
  });
});
