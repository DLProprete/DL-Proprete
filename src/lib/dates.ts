// ServiceTemplate.startTime/endTime sont des colonnes Postgres TIME (heure
// murale du site, pas un instant) : ancrées sur une date de référence fixe
// en UTC pour éviter tout glissement de fuseau à la lecture/écriture.
export function timeStringToDate(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
}

export function formatTime(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

const PARIS_TZ = "Europe/Paris";
const DAY_MS = 86_400_000;

// Shift.date est une colonne @db.Date (jour calendaire pur, pas d'heure) :
// ancrée à minuit UTC par convention Prisma.
export function dateOnlyUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function parisOffsetMinutes(utcGuess: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(utcGuess)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  const asIfUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asIfUTC - utcGuess.getTime()) / 60_000;
}

// Convertit une date + heure murale Europe/Paris en instant UTC réel, en
// tenant compte du décalage horaire (heure d'été/hiver) — une simple
// ancre UTC serait fausse en permanence (Paris n'est jamais UTC+0).
export function parisWallTimeToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMinutes = parisOffsetMinutes(guess);
  return new Date(guess.getTime() - offsetMinutes * 60_000);
}

// "Aujourd'hui" en Europe/Paris, indépendamment du fuseau du serveur.
export function parisToday(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: PARIS_TZ }).formatToParts(new Date());
  const map = parts.reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

// Lundi de la semaine (calendaire, UTC) contenant `dateOnly`.
export function startOfWeekMonday(dateOnly: Date): Date {
  const weekday = dateOnly.getUTCDay(); // 0=dimanche..6=samedi
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return addDays(dateOnly, diff);
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return dateOnlyUTC(year, month, day);
}

export function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
