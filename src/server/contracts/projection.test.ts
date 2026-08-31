import { describe, expect, it } from "vitest";
import { contractMonthlyProjection } from "./projection";

describe("contractMonthlyProjection", () => {
  it("FLAT_INDICATIVE_HOURS : reprend le volume indicatif tel quel", () => {
    const projection = contractMonthlyProjection({
      billingBasis: "FLAT_INDICATIVE_HOURS",
      hourlyRateHT: 20,
      indicativeMonthlyHours: 80,
      serviceTemplates: [],
    });
    expect(projection.monthlyHours).toBe(80);
    expect(projection.monthlyAmountHT).toBe(1600);
  });

  it("CALENDAR_SHIFTS : approxime depuis les vacations hebdomadaires actives", () => {
    // 1 vacation, 2 jours/semaine, 90 min, 2 agents = 6h/semaine.
    const projection = contractMonthlyProjection({
      billingBasis: "CALENDAR_SHIFTS",
      hourlyRateHT: 30,
      indicativeMonthlyHours: null,
      serviceTemplates: [
        { isActive: true, daysOfWeek: [2, 5], durationMinutes: 90, requiredAgents: 2 },
      ],
    });
    // 6h/semaine x 52/12 ≈ 26 h/mois.
    expect(projection.monthlyHours).toBeCloseTo(26, 0);
    expect(projection.monthlyAmountHT).toBeCloseTo(780, 0);
  });

  it("ignore les vacations désactivées", () => {
    const projection = contractMonthlyProjection({
      billingBasis: "CALENDAR_SHIFTS",
      hourlyRateHT: 20,
      indicativeMonthlyHours: null,
      serviceTemplates: [
        { isActive: false, daysOfWeek: [1, 2, 3, 4, 5], durationMinutes: 120, requiredAgents: 1 },
      ],
    });
    expect(projection.monthlyHours).toBe(0);
    expect(projection.monthlyAmountHT).toBe(0);
  });
});
