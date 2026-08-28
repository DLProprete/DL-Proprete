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
