import { describe, expect, it } from "vitest";
import { agentConstraintViolation } from "./agent-constraints";
import { dateOnlyUTC, parisWallTimeToUTC, timeStringToDate } from "@/lib/dates";

const baseAgent = {
  firstName: "Agent",
  lastName: "Un",
  maxEndTime: null as Date | null,
  minStartTime: null as Date | null,
  noWorkWeekdays: [] as number[],
};

// 2026-06-15 est un lundi (voir src/lib/dates.test.ts), 2026-06-17 un mercredi.
const monday = dateOnlyUTC(2026, 6, 15);
const wednesday = dateOnlyUTC(2026, 6, 17);

describe("agentConstraintViolation", () => {
  it("ne relève aucune violation quand tout est conforme", () => {
    const shift = {
      date: monday,
      startAt: parisWallTimeToUTC(2026, 6, 15, 8, 0),
      endAt: parisWallTimeToUTC(2026, 6, 15, 12, 0),
    };
    expect(agentConstraintViolation(baseAgent, shift)).toBeNull();
  });

  it("refuse une vacation qui finit après maxEndTime", () => {
    const agent = { ...baseAgent, maxEndTime: timeStringToDate("17:00") };
    const shift = {
      date: monday,
      startAt: parisWallTimeToUTC(2026, 6, 15, 14, 0),
      endAt: parisWallTimeToUTC(2026, 6, 15, 18, 0),
    };
    expect(agentConstraintViolation(agent, shift)).toBe(
      "Agent Un : fin de vacation 18:00 > limite 17:00",
    );
  });

  it("refuse une vacation qui commence avant minStartTime", () => {
    const agent = { ...baseAgent, minStartTime: timeStringToDate("06:00") };
    const shift = {
      date: monday,
      startAt: parisWallTimeToUTC(2026, 6, 15, 5, 0),
      endAt: parisWallTimeToUTC(2026, 6, 15, 8, 0),
    };
    expect(agentConstraintViolation(agent, shift)).toBe(
      "Agent Un : début de vacation 05:00 < limite 06:00",
    );
  });

  it("refuse un jour listé dans noWorkWeekdays", () => {
    const agent = { ...baseAgent, noWorkWeekdays: [3] }; // 3 = mercredi
    const shift = {
      date: wednesday,
      startAt: parisWallTimeToUTC(2026, 6, 17, 8, 0),
      endAt: parisWallTimeToUTC(2026, 6, 17, 12, 0),
    };
    expect(agentConstraintViolation(agent, shift)).toBe(
      "Agent Un : jour non travaillé (mercredi)",
    );
  });
});
