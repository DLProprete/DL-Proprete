import { describe, expect, it } from "vitest";
import { siteMarginAlerts, type SiteAlert } from "./alerts";
import type { SiteMargin } from "./margins";

function margin(overrides: Partial<SiteMargin>): SiteMargin {
  return {
    siteId: "site-1",
    siteName: "Site Test",
    revenueHT: 1000,
    costHT: 500,
    marginHT: 500,
    hasUnknownCost: false,
    ...overrides,
  };
}

function kinds(alerts: SiteAlert[]): SiteAlert["kind"][] {
  return alerts.map((a) => a.kind);
}

// Fonction pure, sans base — comme ccn-alerts.test.ts : une régression sur
// les seuils doit se voir en une seconde, sans fixture DB.
describe("siteMarginAlerts", () => {
  it("ne signale rien pour un site sain (marge correcte, stable, coût connu)", () => {
    const current = [margin({ revenueHT: 1000, marginHT: 300 })]; // 30 %
    const previous = [margin({ revenueHT: 1000, marginHT: 280 })]; // 28 %
    expect(siteMarginAlerts(current, previous)).toEqual([]);
  });

  it("signale une marge sous 15 % du revenu facturé", () => {
    const current = [margin({ revenueHT: 1000, marginHT: 100 })]; // 10 %
    const alerts = siteMarginAlerts(current, []);
    expect(kinds(alerts)).toEqual(["LOW_MARGIN"]);
  });

  it("ne signale pas de marge basse quand le site n'a pas été facturé ce mois", () => {
    const current = [margin({ revenueHT: 0, marginHT: -50 })];
    expect(siteMarginAlerts(current, [])).toEqual([]);
  });

  it("signale une baisse de marge de 10 points ou plus, pas en dessous", () => {
    const current = [margin({ revenueHT: 1000, marginHT: 400 })]; // 40 %
    const justBelow = [margin({ revenueHT: 1000, marginHT: 490 })]; // 49 % -> baisse de 9 pts
    const atThreshold = [margin({ revenueHT: 1000, marginHT: 500 })]; // 50 % -> baisse de 10 pts

    expect(kinds(siteMarginAlerts(current, justBelow))).toEqual([]);
    expect(kinds(siteMarginAlerts(current, atThreshold))).toEqual(["DECLINING_MARGIN"]);
  });

  it("ne compare pas la baisse quand le mois précédent n'avait pas de facture", () => {
    const current = [margin({ revenueHT: 1000, marginHT: 400 })];
    const previous = [margin({ revenueHT: 0, marginHT: 0 })];
    expect(kinds(siteMarginAlerts(current, previous))).toEqual([]);
  });

  it("reflète hasUnknownCost en alerte PARTIAL_COST", () => {
    const current = [margin({ revenueHT: 1000, marginHT: 300, hasUnknownCost: true })];
    expect(kinds(siteMarginAlerts(current, []))).toEqual(["PARTIAL_COST"]);
  });

  it("cumule plusieurs alertes sur le même site", () => {
    const current = [margin({ revenueHT: 1000, marginHT: 100, hasUnknownCost: true })]; // 10 %, coût partiel
    const previous = [margin({ revenueHT: 1000, marginHT: 500 })]; // 50 % -> baisse de 40 pts
    expect(kinds(siteMarginAlerts(current, previous))).toEqual(["LOW_MARGIN", "DECLINING_MARGIN", "PARTIAL_COST"]);
  });
});
