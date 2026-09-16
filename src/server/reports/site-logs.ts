import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { monthRange } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN"] as const;

export type SiteLogSummary = {
  siteId: string;
  siteName: string;
  anomaly: number;
  equipment: number;
  other: number;
  total: number;
};

// Agrégation de la main courante (SiteLog) par site pour un mois donné —
// jusqu'ici seulement consultable en liste brute par site.
export async function getSiteLogSummary(user: SessionUser, year: number, month: number): Promise<SiteLogSummary[]> {
  requireRole(user, [...MANAGE_ROLES]);
  const { start, end } = monthRange(year, month);

  const logs = await prisma.siteLog.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { type: true, site: { select: { id: true, name: true } } },
  });

  const bySite = new Map<string, SiteLogSummary>();
  for (const log of logs) {
    const existing = bySite.get(log.site.id) ?? {
      siteId: log.site.id,
      siteName: log.site.name,
      anomaly: 0,
      equipment: 0,
      other: 0,
      total: 0,
    };
    if (log.type === "ANOMALY") existing.anomaly += 1;
    else if (log.type === "EQUIPMENT") existing.equipment += 1;
    else existing.other += 1;
    existing.total += 1;
    bySite.set(log.site.id, existing);
  }

  return [...bySite.values()].sort((a, b) => b.total - a.total);
}
