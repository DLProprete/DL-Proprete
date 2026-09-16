import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { monthRange } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN"] as const;

export type SiteMargin = {
  siteId: string;
  siteName: string;
  revenueHT: number;
  costHT: number;
  marginHT: number;
  hasUnknownCost: boolean;
};

// Marge par site = CA facturé HT (même filtre que getMonthlyRevenue) - coût
// des heures VALIDATED (durée planifiée, même règle que
// getValidatedHoursForContractMonth) x taux de coût actuel de l'agent
// (User.hourlyCostHT, pas d'historique — voir prisma/schema.prisma). Un
// agent sans taux renseigné : ses heures ne sont pas ajoutées au coût, et
// le site est marqué hasUnknownCost plutôt que d'afficher un coût faux.
export async function getSiteMarginsForMonth(user: SessionUser, year: number, month: number): Promise<SiteMargin[]> {
  requireRole(user, [...MANAGE_ROLES]);
  const { start, end } = monthRange(year, month);

  const [sites, invoices, entries] = await Promise.all([
    prisma.site.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.invoice.findMany({
      where: {
        issuedOn: { gte: start, lt: end },
        status: { notIn: ["DRAFT", "CANCELLED"] },
        contractSite: { isNot: null },
      },
      select: { amountHT: true, contractSite: { select: { siteId: true } } },
    }),
    prisma.timeEntry.findMany({
      where: { status: "VALIDATED", clockInAt: { gte: start, lt: end } },
      select: {
        siteId: true,
        clockInAt: true,
        clockOutAt: true,
        shift: { select: { startAt: true, endAt: true } },
        user: { select: { hourlyCostHT: true } },
      },
    }),
  ]);

  const revenueBySite = new Map<string, number>();
  for (const invoice of invoices) {
    const siteId = invoice.contractSite?.siteId;
    if (!siteId) continue;
    revenueBySite.set(siteId, (revenueBySite.get(siteId) ?? 0) + Number(invoice.amountHT));
  }

  const costBySite = new Map<string, number>();
  const unknownCostSites = new Set<string>();
  for (const entry of entries) {
    const minutes = entry.shift
      ? (entry.shift.endAt.getTime() - entry.shift.startAt.getTime()) / 60_000
      : entry.clockOutAt
        ? (entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 60_000
        : 0;
    if (entry.user.hourlyCostHT == null) {
      unknownCostSites.add(entry.siteId);
      continue;
    }
    const cost = (minutes / 60) * Number(entry.user.hourlyCostHT);
    costBySite.set(entry.siteId, (costBySite.get(entry.siteId) ?? 0) + cost);
  }

  return sites.map((site) => {
    const revenueHT = revenueBySite.get(site.id) ?? 0;
    const costHT = costBySite.get(site.id) ?? 0;
    return {
      siteId: site.id,
      siteName: site.name,
      revenueHT,
      costHT,
      marginHT: revenueHT - costHT,
      hasUnknownCost: unknownCostSites.has(site.id),
    };
  });
}
