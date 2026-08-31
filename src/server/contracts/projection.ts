// Projection "ce contrat représente X h/mois ≈ Y € HT" — le chiffre de
// pilotage cité par l'audit du 31/08/2026 (Mo5), absent de la fiche
// contrat. Fonction pure, testable sans base.

const AVG_WEEKS_PER_MONTH = 52 / 12; // ≈ 4,33 — un mois n'a pas un nombre entier de semaines.

export type ContractForProjection = {
  billingBasis: string;
  hourlyRateHT: number;
  indicativeMonthlyHours: number | null;
  serviceTemplates: {
    isActive: boolean;
    daysOfWeek: number[];
    durationMinutes: number;
    requiredAgents: number;
  }[];
};

export type ContractProjection = {
  /** Approximatif pour CALENDAR_SHIFTS (moyenne 4,33 semaines/mois), exact pour FLAT_INDICATIVE_HOURS. */
  monthlyHours: number;
  monthlyAmountHT: number;
};

export function contractMonthlyProjection(contract: ContractForProjection): ContractProjection {
  const monthlyHours =
    contract.billingBasis === "FLAT_INDICATIVE_HOURS" && contract.indicativeMonthlyHours
      ? contract.indicativeMonthlyHours
      : weeklyHoursFromTemplates(contract.serviceTemplates) * AVG_WEEKS_PER_MONTH;

  return { monthlyHours, monthlyAmountHT: monthlyHours * contract.hourlyRateHT };
}

function weeklyHoursFromTemplates(templates: ContractForProjection["serviceTemplates"]): number {
  const weeklyMinutes = templates
    .filter((template) => template.isActive)
    .reduce(
      (sum, template) =>
        sum + template.daysOfWeek.length * template.durationMinutes * template.requiredAgents,
      0,
    );
  return weeklyMinutes / 60;
}
