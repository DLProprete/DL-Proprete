// Regles de calcul des heures facturables, isolees en fonctions pures pour
// etre testables sans base : c'est le chiffre qui part chez le client, il ne
// doit dependre d'aucun etat implicite.

export type BillableShift = {
  /** Duree vendue de la vacation, figee a la generation (pas la fenetre d'acces). */
  billableMinutes: number;
  /** Nombre d'agents attendus sur la vacation. */
  requiredAgents: number;
};

/**
 * Heures de main-d'oeuvre vendues sur un ensemble de vacations.
 *
 * En proprete on vend des heures d'agent, pas des creneaux : une vacation de
 * 1 h 30 a deux agents represente 3 h facturables. Oublier `requiredAgents`
 * divisait la facture par le nombre d'agents requis, silencieusement.
 */
export function plannedHoursFromShifts(shifts: BillableShift[]): number {
  const totalMinutes = shifts.reduce(
    (sum, shift) => sum + shift.billableMinutes * Math.max(1, shift.requiredAgents),
    0,
  );
  return roundHours(totalMinutes / 60);
}

/** Arrondi au centieme d'heure : evite les 6.000000000000001 en base. */
export function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100;
}

export type CoverageInput = {
  /** Jours du mois couverts par au moins une vacation non annulee. */
  coveredDays: number;
  /** Jours calendaires du mois. */
  daysInMonth: number;
  /** Heures calculees a partir des vacations du mois. */
  computedHours: number;
  /** Reference contractuelle, si le contrat en porte une. */
  indicativeMonthlyHours: number | null;
};

export type CoverageWarning =
  | { kind: "NO_SHIFTS" }
  | { kind: "PARTIAL_MONTH"; lastCoveredDay: number; daysInMonth: number }
  | { kind: "FAR_FROM_INDICATIVE"; computedHours: number; indicativeHours: number; deltaPercent: number };

/** Ecart tolere entre le calcule et la reference contractuelle. */
export const INDICATIVE_TOLERANCE_PERCENT = 10;

/**
 * Detecte les factures manifestement incompletes AVANT emission.
 *
 * Le generateur de planning ne couvre que 8 semaines glissantes ; rien ne
 * garantissait que le mois facture soit entierement planifie. Une facture
 * sortait alors minoree, sans erreur ni alerte — le pire mode de defaillance
 * possible pour une facture.
 */
export function coverageWarnings(input: CoverageInput, lastCoveredDay: number): CoverageWarning[] {
  const warnings: CoverageWarning[] = [];

  if (input.coveredDays === 0) {
    warnings.push({ kind: "NO_SHIFTS" });
    return warnings;
  }

  // Un mois planifie s'arrete rarement pile en cours de mois : si plus de deux
  // jours separent la derniere vacation de la fin du mois, le planning n'a
  // probablement pas ete genere jusqu'au bout.
  if (input.daysInMonth - lastCoveredDay > 2) {
    warnings.push({
      kind: "PARTIAL_MONTH",
      lastCoveredDay,
      daysInMonth: input.daysInMonth,
    });
  }

  if (input.indicativeMonthlyHours && input.indicativeMonthlyHours > 0) {
    const delta =
      ((input.computedHours - input.indicativeMonthlyHours) / input.indicativeMonthlyHours) * 100;
    if (Math.abs(delta) > INDICATIVE_TOLERANCE_PERCENT) {
      warnings.push({
        kind: "FAR_FROM_INDICATIVE",
        computedHours: input.computedHours,
        indicativeHours: input.indicativeMonthlyHours,
        deltaPercent: Math.round(delta),
      });
    }
  }

  return warnings;
}

export function describeCoverageWarning(warning: CoverageWarning): string {
  switch (warning.kind) {
    case "NO_SHIFTS":
      return "Aucune vacation planifiée sur le mois : la facture serait à 0 €.";
    case "PARTIAL_MONTH":
      return `Planning incomplet : la dernière vacation du mois tombe le ${warning.lastCoveredDay}, sur ${warning.daysInMonth} jours. Générer le planning avant de facturer.`;
    case "FAR_FROM_INDICATIVE":
      return `Écart de ${warning.deltaPercent > 0 ? "+" : ""}${warning.deltaPercent} % avec le volume contractuel (${warning.computedHours.toFixed(2)} h calculées contre ${warning.indicativeHours.toFixed(2)} h de référence).`;
  }
}
