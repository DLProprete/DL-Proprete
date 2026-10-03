import { describe, expect, it } from "vitest";
import { parisWallTimeToUTC, parseDateOnly, startOfWeekMonday, dateOnlyUTC, formatLongDateParis } from "./dates";

describe("parisWallTimeToUTC", () => {
  it("convertit une heure d'été (UTC+2) correctement", () => {
    // 15 juin 2026, 06:00 heure de Paris (été) == 04:00 UTC
    const result = parisWallTimeToUTC(2026, 6, 15, 6, 0);
    expect(result.toISOString()).toBe("2026-06-15T04:00:00.000Z");
  });

  it("convertit une heure d'hiver (UTC+1) correctement", () => {
    // 15 janvier 2026, 06:00 heure de Paris (hiver) == 05:00 UTC
    const result = parisWallTimeToUTC(2026, 1, 15, 6, 0);
    expect(result.toISOString()).toBe("2026-01-15T05:00:00.000Z");
  });
});

describe("startOfWeekMonday", () => {
  it("renvoie la même date si c'est déjà un lundi", () => {
    const monday = parseDateOnly("2026-06-15");
    expect(startOfWeekMonday(monday).toISOString()).toBe(monday.toISOString());
  });

  it("recule jusqu'au lundi pour un jour en milieu de semaine", () => {
    const wednesday = parseDateOnly("2026-06-17");
    expect(startOfWeekMonday(wednesday).toISOString()).toBe(dateOnlyUTC(2026, 6, 15).toISOString());
  });

  it("recule jusqu'au lundi pour un dimanche", () => {
    const sunday = parseDateOnly("2026-06-21");
    expect(startOfWeekMonday(sunday).toISOString()).toBe(dateOnlyUTC(2026, 6, 15).toISOString());
  });
});

describe("formatLongDateParis", () => {
  it("donne le jour et la date en toutes lettres, à l'heure de Paris", () => {
    expect(formatLongDateParis(new Date("2026-10-03T10:00:00Z"))).toBe("samedi 3 octobre");
    // 23 h 30 UTC le 3 = déjà le 4 à Paris
    expect(formatLongDateParis(new Date("2026-10-03T23:30:00Z"))).toBe("dimanche 4 octobre");
  });
});
