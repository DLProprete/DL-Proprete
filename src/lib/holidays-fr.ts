import { addDays, dateOnlyUTC } from "@/lib/dates";

// Algorithme de Meeus/Jones/Butcher (calendrier grégorien) : calcule Pâques
// sans appel réseau ni table de dates codée en dur année par année.
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dateOnlyUTC(year, month, day);
}

export type FrenchHoliday = { date: Date; name: string };

// Jours fériés France métropole (le Calvados n'a pas de jour local
// spécifique, contrairement à l'Alsace-Moselle ou aux DOM).
export function frenchHolidays(year: number): FrenchHoliday[] {
  const easter = easterSunday(year);
  return [
    { date: dateOnlyUTC(year, 1, 1), name: "Jour de l'an" },
    { date: addDays(easter, 1), name: "Lundi de Pâques" },
    { date: dateOnlyUTC(year, 5, 1), name: "Fête du Travail" },
    { date: dateOnlyUTC(year, 5, 8), name: "Victoire 1945" },
    { date: addDays(easter, 39), name: "Ascension" },
    { date: addDays(easter, 50), name: "Lundi de Pentecôte" },
    { date: dateOnlyUTC(year, 7, 14), name: "Fête nationale" },
    { date: dateOnlyUTC(year, 8, 15), name: "Assomption" },
    { date: dateOnlyUTC(year, 11, 1), name: "Toussaint" },
    { date: dateOnlyUTC(year, 11, 11), name: "Armistice" },
    { date: dateOnlyUTC(year, 12, 25), name: "Noël" },
  ];
}
