import { describe, expect, it } from "vitest";
import {
  coverageWarnings,
  describeCoverageWarning,
  plannedHoursFromShifts,
} from "./planned-hours";

// Ces regles decident du montant envoye au client : elles sont pures et
// testees sans base, pour qu'une regression se voie en une seconde.
describe("heures facturables", () => {
  it("somme les durées vendues, pas les fenêtres d'accès", () => {
    // 3 vacations de 2 h, un agent chacune.
    const shifts = Array.from({ length: 3 }, () => ({ billableMinutes: 120, requiredAgents: 1 }));
    expect(plannedHoursFromShifts(shifts)).toBe(6);
  });

  it("multiplie par le nombre d'agents requis (régression : facture divisée par 2)", () => {
    // 6 vacations de 1 h 30 a deux agents = 18 h de main-d'oeuvre vendues.
    // Avant correction, le calcul renvoyait 9 h : le client etait facture
    // moitie prix sur toutes les vacations a plusieurs agents.
    const shifts = Array.from({ length: 6 }, () => ({ billableMinutes: 90, requiredAgents: 2 }));
    expect(plannedHoursFromShifts(shifts)).toBe(18);
  });

  it("traite un requiredAgents à 0 comme un agent, jamais comme une facture à 0", () => {
    expect(plannedHoursFromShifts([{ billableMinutes: 60, requiredAgents: 0 }])).toBe(1);
  });

  it("rend 0 sur un mois sans vacation", () => {
    expect(plannedHoursFromShifts([])).toBe(0);
  });

  it("arrondit au centième d'heure", () => {
    expect(plannedHoursFromShifts([{ billableMinutes: 50, requiredAgents: 1 }])).toBe(0.83);
  });
});

describe("garde-fous de complétude", () => {
  const full = { coveredDays: 21, daysInMonth: 31, computedHours: 42, indicativeMonthlyHours: 42 };

  it("ne signale rien sur un mois planifié jusqu'au bout et conforme au contrat", () => {
    expect(coverageWarnings(full, 31)).toEqual([]);
  });

  it("signale un mois sans aucune vacation", () => {
    const warnings = coverageWarnings({ ...full, coveredDays: 0, computedHours: 0 }, 0);
    expect(warnings).toEqual([{ kind: "NO_SHIFTS" }]);
  });

  it("signale un planning qui s'arrête en cours de mois (régression F-2026-0006)", () => {
    // Cas reel : planning genere sur 8 semaines glissantes seulement, facture
    // d'aout sortie a 6 h au lieu de ~42 h, sans la moindre alerte.
    const warnings = coverageWarnings(
      { coveredDays: 3, daysInMonth: 31, computedHours: 6, indicativeMonthlyHours: 42 },
      3,
    );
    expect(warnings.map((w) => w.kind)).toContain("PARTIAL_MONTH");
    expect(warnings.map((w) => w.kind)).toContain("FAR_FROM_INDICATIVE");
  });

  it("tolère un écart de 10 % avec le volume contractuel, pas au-delà", () => {
    const withinTolerance = coverageWarnings({ ...full, computedHours: 45.5 }, 31);
    expect(withinTolerance).toEqual([]);

    const beyond = coverageWarnings({ ...full, computedHours: 47 }, 31);
    expect(beyond.map((w) => w.kind)).toEqual(["FAR_FROM_INDICATIVE"]);
  });

  it("ne compare pas au contractuel quand le contrat ne porte pas de référence", () => {
    expect(coverageWarnings({ ...full, indicativeMonthlyHours: null, computedHours: 6 }, 31)).toEqual(
      [],
    );
  });

  it("ne crie pas sur les deux derniers jours du mois (un mois finit rarement pile)", () => {
    expect(coverageWarnings(full, 29)).toEqual([]);
    expect(coverageWarnings(full, 28).map((w) => w.kind)).toEqual(["PARTIAL_MONTH"]);
  });

  it("produit un message lisible par l'ADMIN", () => {
    expect(describeCoverageWarning({ kind: "NO_SHIFTS" })).toContain("Aucune vacation");
    expect(
      describeCoverageWarning({ kind: "PARTIAL_MONTH", lastCoveredDay: 3, daysInMonth: 31 }),
    ).toContain("Planning incomplet");
  });
});
