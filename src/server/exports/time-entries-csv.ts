import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { monthRange } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN"] as const;

// Champ CSV échappé : entoure de guillemets si nécessaire, double les
// guillemets internes (RFC 4180).
function csvField(value: string): string {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

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
    },
    orderBy: [{ user: { lastName: "asc" } }, { clockInAt: "asc" }],
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

  const header = ["Agent", "Site", "Début", "Fin", "Durée (h)"].join(";");
  const rows = entries.map((entry) => {
    const durationHours = entry.clockOutAt
      ? (entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 3_600_000
      : 0;
    return [
      csvField(`${entry.user.firstName} ${entry.user.lastName}`),
      csvField(entry.site.name),
      csvField(dateTimeFormatter.format(entry.clockInAt)),
      csvField(entry.clockOutAt ? dateTimeFormatter.format(entry.clockOutAt) : ""),
      durationHours.toFixed(2).replace(".", ","),
    ].join(";");
  });

  return ["﻿" + header, ...rows].join("\r\n");
}
