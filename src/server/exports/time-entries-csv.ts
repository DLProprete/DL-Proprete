import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { monthRange, formatTimeInParis } from "@/lib/dates";
import { CSV_BOM, csvField } from "@/lib/csv";

const MANAGE_ROLES = ["ADMIN"] as const;

// Point-virgule (pas virgule) et virgule décimale : Excel en locale fr-FR
// interprète mal un CSV séparé par des virgules. Destiné à l'expert-comptable.
export async function exportValidatedTimeEntriesCsv(
  user: SessionUser,
  year: number,
  month: number,
): Promise<string> {
  requireRole(user, [...MANAGE_ROLES]);
  const { start, end } = monthRange(year, month);

  const entries = await prisma.timeEntry.findMany({
    where: { status: "VALIDATED", clockInAt: { gte: start, lt: end } },
    include: {
      user: { select: { firstName: true, lastName: true } },
      site: { select: { name: true } },
      shift: { select: { startAt: true, endAt: true } },
    },
    orderBy: [{ user: { lastName: "asc" } }, { clockInAt: "asc" }],
  });

  const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  // Décision du 12/09 : plus de suivi d'heure d'arrivée réelle. "Début"/
  // "Fin" afficheraient des heures qui ne correspondent plus à la durée
  // retenue (planifiée) — remplacés par le créneau prévu et l'instant de
  // soumission réel, cohérents entre eux.
  const header = ["Agent", "Site", "Date", "Créneau prévu", "Soumis le", "Durée (h)"].join(";");
  const rows = entries.map((entry) => {
    const durationHours = entry.shift
      ? (entry.shift.endAt.getTime() - entry.shift.startAt.getTime()) / 3_600_000
      : entry.clockOutAt
        ? (entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 3_600_000
        : 0;
    const plannedWindow = entry.shift
      ? `${formatTimeInParis(entry.shift.startAt)}-${formatTimeInParis(entry.shift.endAt)}`
      : "hors planning";
    return [
      csvField(`${entry.user.firstName} ${entry.user.lastName}`),
      csvField(entry.site.name),
      csvField(dateFormatter.format(entry.clockInAt)),
      csvField(plannedWindow),
      csvField(entry.clockOutAt ? dateTimeFormatter.format(entry.clockOutAt) : ""),
      durationHours.toFixed(2).replace(".", ","),
    ].join(";");
  });

  return [CSV_BOM + header, ...rows].join("\r\n");
}
