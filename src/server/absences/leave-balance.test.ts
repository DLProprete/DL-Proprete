import { describe, expect, it } from "vitest";
import { paidLeaveDaysTaken } from "./leave-balance";

function absence(type: string, status: string, startsOn: string, endsOn: string) {
  return { type, status, startsOn: new Date(startsOn), endsOn: new Date(endsOn) };
}

describe("paidLeaveDaysTaken", () => {
  it("compte les jours calendaires inclusifs d'une absence approuvée", () => {
    // 10 au 12 inclus = 3 jours.
    const absences = [absence("PAID_LEAVE", "APPROVED", "2031-07-10", "2031-07-12")];
    expect(paidLeaveDaysTaken(absences, 2031)).toBe(3);
  });

  it("ignore les absences non PAID_LEAVE", () => {
    const absences = [absence("SICK", "APPROVED", "2031-07-10", "2031-07-12")];
    expect(paidLeaveDaysTaken(absences, 2031)).toBe(0);
  });

  it("ignore les absences non approuvées", () => {
    const absences = [absence("PAID_LEAVE", "PENDING", "2031-07-10", "2031-07-12")];
    expect(paidLeaveDaysTaken(absences, 2031)).toBe(0);
  });

  it("ignore une absence entièrement dans une autre année", () => {
    const absences = [absence("PAID_LEAVE", "APPROVED", "2030-07-10", "2030-07-12")];
    expect(paidLeaveDaysTaken(absences, 2031)).toBe(0);
  });

  it("clippe une absence à cheval sur la fin d'année", () => {
    // 30 déc au 3 jan : seuls 30, 31 déc comptent pour 2031.
    const absences = [absence("PAID_LEAVE", "APPROVED", "2031-12-30", "2032-01-03")];
    expect(paidLeaveDaysTaken(absences, 2031)).toBe(2);
    expect(paidLeaveDaysTaken(absences, 2032)).toBe(3);
  });

  it("additionne plusieurs absences sur l'année", () => {
    const absences = [
      absence("PAID_LEAVE", "APPROVED", "2031-03-01", "2031-03-05"), // 5 j
      absence("PAID_LEAVE", "APPROVED", "2031-08-01", "2031-08-10"), // 10 j
    ];
    expect(paidLeaveDaysTaken(absences, 2031)).toBe(15);
  });
});
