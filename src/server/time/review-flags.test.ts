import { describe, expect, it } from "vitest";
import { reviewFlags } from "./review-flags";

describe("reviewFlags", () => {
  const shift = {
    startAt: new Date("2026-08-31T06:30:00Z"),
    endAt: new Date("2026-08-31T08:30:00Z"), // 120 min planifiées
  };

  it("lié à un shift : durée planifiée, jamais d'anomalie — quels que soient clockIn/clockOut réels", () => {
    const flags = reviewFlags({
      clockInAt: new Date("2026-08-31T06:30:00Z"),
      clockOutAt: new Date("2026-08-31T06:33:00Z"), // terminé 3 min après, sans rapport
      shift,
    });
    expect(flags.durationMinutes).toBe(120);
    expect(flags.isAnomaly).toBe(false);
  });

  it("hors planning (pas de vacation liée) : toujours anomalie, durée mesurée réellement", () => {
    const flags = reviewFlags({
      clockInAt: new Date("2026-08-31T06:30:00Z"),
      clockOutAt: new Date("2026-08-31T08:30:00Z"),
      shift: null,
    });
    expect(flags.durationMinutes).toBe(120);
    expect(flags.isAnomaly).toBe(true);
  });

  it("hors planning, pointage encore ouvert (pas de clockOutAt) : durée null, pas de crash", () => {
    const flags = reviewFlags({
      clockInAt: new Date("2026-08-31T06:30:00Z"),
      clockOutAt: null,
      shift: null,
    });
    expect(flags.durationMinutes).toBeNull();
    expect(flags.isAnomaly).toBe(true);
  });
});
