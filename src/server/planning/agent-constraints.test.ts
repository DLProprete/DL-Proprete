import { describe, expect, it } from "vitest";
import { agentConstraintViolation, type ScheduleException } from "./agent-constraints";
import { dateOnlyUTC, parisWallTimeToUTC } from "@/lib/dates";

const baseAgent = {
  firstName: "Agent",
  lastName: "Un",
  scheduleExceptions: [] as ScheduleException[],
};

// 2026-06-15 est un lundi (voir src/lib/dates.test.ts), 2026-06-17 un
// mercredi, 2026-06-18 un jeudi.
const monday = dateOnlyUTC(2026, 6, 15);
const wednesday = dateOnlyUTC(2026, 6, 17);
const thursday = dateOnlyUTC(2026, 6, 18);

describe("agentConstraintViolation", () => {
  it("ne relève aucune violation quand tout est conforme", () => {
    const shift = {
      date: monday,
      startAt: parisWallTimeToUTC(2026, 6, 15, 8, 0),
      endAt: parisWallTimeToUTC(2026, 6, 15, 12, 0),
    };
    expect(agentConstraintViolation(baseAgent, shift)).toBeNull();
  });

  it("bloque un jour entier quand l'exclusion n'a ni notBefore ni notAfter", () => {
    const agent = { ...baseAgent, scheduleExceptions: [{ weekdays: [3] }] }; // 3 = mercredi
    const shift = {
      date: wednesday,
      startAt: parisWallTimeToUTC(2026, 6, 17, 8, 0),
      endAt: parisWallTimeToUTC(2026, 6, 17, 12, 0),
    };
    expect(agentConstraintViolation(agent, shift)).toBe(
      "Agent Un : jour non travaillé (mercredi)",
    );
  });

  it("refuse une vacation qui commence avant notBefore, le jour concerné", () => {
    const agent = { ...baseAgent, scheduleExceptions: [{ weekdays: [1], notBefore: "06:00" }] };
    const shift = {
      date: monday,
      startAt: parisWallTimeToUTC(2026, 6, 15, 5, 0),
      endAt: parisWallTimeToUTC(2026, 6, 15, 8, 0),
    };
    expect(agentConstraintViolation(agent, shift)).toBe(
      "Agent Un : début de vacation 05:00 < limite 06:00 (lundi)",
    );
  });

  it("refuse une vacation qui finit après notAfter, le jour concerné", () => {
    const agent = { ...baseAgent, scheduleExceptions: [{ weekdays: [3], notAfter: "14:00" }] };
    const shift = {
      date: wednesday,
      startAt: parisWallTimeToUTC(2026, 6, 17, 12, 0),
      endAt: parisWallTimeToUTC(2026, 6, 17, 16, 0),
    };
    expect(agentConstraintViolation(agent, shift)).toBe(
      "Agent Un : fin de vacation 16:00 > limite 14:00 (mercredi)",
    );
  });

  it("n'objecte pas la même exclusion horaire un autre jour de la semaine", () => {
    // "Mercredi après 14h" ne doit pas s'appliquer un jeudi.
    const agent = { ...baseAgent, scheduleExceptions: [{ weekdays: [3], notAfter: "14:00" }] };
    const shift = {
      date: thursday,
      startAt: parisWallTimeToUTC(2026, 6, 18, 12, 0),
      endAt: parisWallTimeToUTC(2026, 6, 18, 16, 0),
    };
    expect(agentConstraintViolation(agent, shift)).toBeNull();
  });

  it("applique deux exclusions distinctes chacune sur son propre jour", () => {
    // Cas motivant ce chantier : "mercredi pas après 14h" ET "lundi/jeudi
    // pas après 16h" combinés, chacune indépendante de l'autre.
    const agent = {
      ...baseAgent,
      scheduleExceptions: [
        { weekdays: [3], notAfter: "14:00" },
        { weekdays: [1, 4], notAfter: "16:00" },
      ],
    };

    const wednesdayShift = {
      date: wednesday,
      startAt: parisWallTimeToUTC(2026, 6, 17, 12, 0),
      endAt: parisWallTimeToUTC(2026, 6, 17, 15, 0),
    };
    expect(agentConstraintViolation(agent, wednesdayShift)).toBe(
      "Agent Un : fin de vacation 15:00 > limite 14:00 (mercredi)",
    );

    const mondayShiftOk = {
      date: monday,
      startAt: parisWallTimeToUTC(2026, 6, 15, 12, 0),
      endAt: parisWallTimeToUTC(2026, 6, 15, 15, 0),
    };
    expect(agentConstraintViolation(agent, mondayShiftOk)).toBeNull();

    const thursdayShiftTooLate = {
      date: thursday,
      startAt: parisWallTimeToUTC(2026, 6, 18, 12, 0),
      endAt: parisWallTimeToUTC(2026, 6, 18, 17, 0),
    };
    expect(agentConstraintViolation(agent, thursdayShiftTooLate)).toBe(
      "Agent Un : fin de vacation 17:00 > limite 16:00 (jeudi)",
    );
  });

  it("refuse une vacation postérieure à la fin d'un contrat CDD", () => {
    const agent = { ...baseAgent, contractType: "CDD" as const, contractEndDate: dateOnlyUTC(2026, 6, 10) };
    const shift = {
      date: monday, // 2026-06-15, après la fin de contrat
      startAt: parisWallTimeToUTC(2026, 6, 15, 8, 0),
      endAt: parisWallTimeToUTC(2026, 6, 15, 12, 0),
    };
    expect(agentConstraintViolation(agent, shift)).toBe(
      "Agent Un : contrat CDD terminé le 2026-06-10",
    );
  });

  it("n'objecte pas si le CDD est encore en cours à la date de la vacation", () => {
    const agent = { ...baseAgent, contractType: "CDD" as const, contractEndDate: dateOnlyUTC(2026, 6, 20) };
    const shift = {
      date: monday,
      startAt: parisWallTimeToUTC(2026, 6, 15, 8, 0),
      endAt: parisWallTimeToUTC(2026, 6, 15, 12, 0),
    };
    expect(agentConstraintViolation(agent, shift)).toBeNull();
  });

  it("n'objecte jamais pour un CDI ou un type de contrat non renseigné", () => {
    const shift = {
      date: monday,
      startAt: parisWallTimeToUTC(2026, 6, 15, 8, 0),
      endAt: parisWallTimeToUTC(2026, 6, 15, 12, 0),
    };
    expect(agentConstraintViolation({ ...baseAgent, contractType: "CDI" }, shift)).toBeNull();
    expect(agentConstraintViolation(baseAgent, shift)).toBeNull();
  });
});
