import { describe, expect, it } from "vitest";
import { shiftState } from "./agent-schedule";

describe("shiftState", () => {
  it("à venir sans pointage", () => {
    expect(shiftState({ timeEntries: [] })).toBe("upcoming");
  });

  it("terminée si une entrée SUBMITTED ou VALIDATED existe", () => {
    expect(shiftState({ timeEntries: [{ status: "SUBMITTED" }] })).toBe("done");
    expect(shiftState({ timeEntries: [{ status: "VALIDATED" }] })).toBe("done");
  });

  it("un pointage REJECTED seul laisse la vacation repointable (pas 'done')", () => {
    expect(shiftState({ timeEntries: [{ status: "REJECTED" }] })).toBe("upcoming");
  });
});
