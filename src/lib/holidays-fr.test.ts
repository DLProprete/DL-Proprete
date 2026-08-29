import { describe, expect, it } from "vitest";
import { frenchHolidays } from "./holidays-fr";
import { formatDateOnly } from "./dates";

describe("frenchHolidays", () => {
  it("calcule les 11 jours fériés 2026, dont les mobiles depuis Pâques (2026-04-05)", () => {
    const holidays = frenchHolidays(2026);
    expect(holidays).toHaveLength(11);

    const byName = Object.fromEntries(holidays.map((h) => [h.name, formatDateOnly(h.date)]));
    expect(byName["Lundi de Pâques"]).toBe("2026-04-06");
    expect(byName["Ascension"]).toBe("2026-05-14");
    expect(byName["Lundi de Pentecôte"]).toBe("2026-05-25");
    expect(byName["Jour de l'an"]).toBe("2026-01-01");
    expect(byName["Noël"]).toBe("2026-12-25");
  });

  it("calcule correctement une autre année (2027, Pâques le 2027-03-28)", () => {
    const holidays = frenchHolidays(2027);
    const byName = Object.fromEntries(holidays.map((h) => [h.name, formatDateOnly(h.date)]));
    expect(byName["Lundi de Pâques"]).toBe("2027-03-29");
  });
});
