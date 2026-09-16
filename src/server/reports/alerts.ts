import { requireRole, type SessionUser } from "@/server/auth/session";
import { getSiteMarginsForMonth, type SiteMargin } from "./margins";

const MANAGE_ROLES = ["ADMIN"] as const;

// ponytail: seuils codés en dur pour cette v1 (demande explicite de
// l'utilisateur, "on ajustera les paramètres plus tard") — à déplacer dans
// Paramètres une fois les données réelles de l'entreprise fixées.
const LOW_MARGIN_RATE = 0.15;
const MARGIN_DECLINE_POINTS = 10;

export type SiteAlert =
  | { kind: "LOW_MARGIN"; siteId: string; siteName: string; marginRate: number }
  | { kind: "DECLINING_MARGIN"; siteId: string; siteName: string; previousRate: number; currentRate: number }
  | { kind: "PARTIAL_COST"; siteId: string; siteName: string };

// Pure — pas de DB, testable directement (même approche que
// src/server/planning/ccn-alerts.ts). Un site peut cumuler plusieurs alertes.
export function siteMarginAlerts(current: SiteMargin[], previous: SiteMargin[]): SiteAlert[] {
  const previousBySite = new Map(previous.map((m) => [m.siteId, m]));
  const alerts: SiteAlert[] = [];

  for (const site of current) {
    // Pas de facture ce mois = rien à mesurer, pas un problème de marge.
    if (site.revenueHT > 0) {
      const currentRate = site.marginHT / site.revenueHT;
      if (currentRate < LOW_MARGIN_RATE) {
        alerts.push({ kind: "LOW_MARGIN", siteId: site.siteId, siteName: site.siteName, marginRate: currentRate });
      }

      const previousSite = previousBySite.get(site.siteId);
      if (previousSite && previousSite.revenueHT > 0) {
        const previousRate = previousSite.marginHT / previousSite.revenueHT;
        // Arrondi au dixième de point : évite qu'une baisse pile au seuil
        // (ex. 50 % -> 40 %) passe sous le radar à cause de l'arithmétique
        // flottante (0.5 - 0.4 = 0.09999999999999998).
        const declinePoints = Math.round((previousRate - currentRate) * 1000) / 10;
        if (declinePoints >= MARGIN_DECLINE_POINTS) {
          alerts.push({ kind: "DECLINING_MARGIN", siteId: site.siteId, siteName: site.siteName, previousRate, currentRate });
        }
      }
    }

    if (site.hasUnknownCost) {
      alerts.push({ kind: "PARTIAL_COST", siteId: site.siteId, siteName: site.siteName });
    }
  }

  return alerts;
}

export async function getSiteMarginAlerts(user: SessionUser, year: number, month: number): Promise<SiteAlert[]> {
  requireRole(user, [...MANAGE_ROLES]);
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

  const [current, previousMargins] = await Promise.all([
    getSiteMarginsForMonth(user, year, month),
    getSiteMarginsForMonth(user, previous.year, previous.month),
  ]);

  return siteMarginAlerts(current, previousMargins);
}
