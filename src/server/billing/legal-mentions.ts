// Mentions obligatoires d'une facture entre professionnels (art. L441-9 et
// L441-10 du code de commerce, art. 242 nonies A de l'annexe II au CGI).
// Isolees ici en fonctions pures : ce sont des regles de droit, elles doivent
// etre testables sans PDF ni base, et relues sans lire du pdfkit.
//
// Reference : https://entreprendre.service-public.gouv.fr/vosdroits/F31808

import type { CompanyProfile } from "@prisma/client";

export type CompanyLegalIdentity = {
  legalName: string;
  address: string;
  legalForm: string | null;
  shareCapital: number | null;
  rcsCity: string | null;
  siret: string | null;
  vatNumber: string | null;
  iban: string | null;
  /** Taux annuel des penalites de retard, en %. Null = repli legal. */
  latePenaltyRate: number | null;
};

export type ClientLegalIdentity = {
  legalName: string;
  billingAddress: string;
  siret: string | null;
  vatNumber: string | null;
};

/** Indemnite forfaitaire pour frais de recouvrement, fixee par decret. */
export const RECOVERY_INDEMNITY_EUR = 40;

/** SIREN = les neuf premiers chiffres du SIRET. */
export function sirenFromSiret(siret: string | null): string | null {
  if (!siret) return null;
  const digits = siret.replace(/\s+/g, "");
  return digits.length >= 9 ? digits.slice(0, 9) : null;
}

/**
 * Bloc d'identification du vendeur : forme juridique, capital, RCS et
 * numeros. Absent jusqu'ici du PDF, alors qu'il est obligatoire sur tout
 * document commercial d'une societe commerciale.
 */
export function sellerIdentityLines(company: CompanyLegalIdentity): string[] {
  const lines: string[] = [company.address];

  const siren = sirenFromSiret(company.siret);
  const statusParts: string[] = [];
  if (company.legalForm) statusParts.push(company.legalForm);
  if (company.shareCapital !== null) {
    statusParts.push(`au capital de ${formatEuros(company.shareCapital)}`);
  }
  if (company.rcsCity && siren) {
    statusParts.push(`RCS ${company.rcsCity} ${siren}`);
  }
  if (statusParts.length > 0) lines.push(statusParts.join(" — "));

  if (company.siret) lines.push(`SIRET ${company.siret}`);
  if (company.vatNumber) lines.push(`TVA intracommunautaire ${company.vatNumber}`);

  return lines;
}

/** Bloc client : le numero de TVA du preneur est obligatoire en B2B. */
export function clientIdentityLines(client: ClientLegalIdentity): string[] {
  const lines: string[] = [client.billingAddress];
  if (client.siret) lines.push(`SIRET ${client.siret}`);
  if (client.vatNumber) lines.push(`TVA intracommunautaire ${client.vatNumber}`);
  return lines;
}

/**
 * Conditions de reglement.
 *
 * L'ancien pied de page affirmait « Aucune pénalité de retard sans mention
 * contractuelle contraire » : juridiquement faux — entre professionnels les
 * penalites sont dues de plein droit — et contraire aux interets de
 * l'entreprise, qui renoncait ainsi par ecrit a ce qui lui est du.
 */
export function paymentTermsLines(
  company: CompanyLegalIdentity,
  paymentTermDays: number,
): string[] {
  const penalty =
    company.latePenaltyRate !== null
      ? `au taux annuel de ${formatPercent(company.latePenaltyRate)}`
      : "au taux de trois fois le taux d'intérêt légal en vigueur";

  return [
    `Règlement à ${paymentTermDays} jours à compter de la date d'émission.`,
    `En cas de retard de paiement, application de plein droit de pénalités ${penalty}, sans qu'un rappel soit nécessaire.`,
    `Indemnité forfaitaire pour frais de recouvrement : ${formatEuros(RECOVERY_INDEMNITY_EUR)} (art. L441-10 du code de commerce), sans préjudice d'une indemnisation complémentaire sur justificatifs.`,
    "Pas d'escompte pour paiement anticipé.",
  ];
}

/** Nature et periode d'execution de la prestation. */
export function serviceDescriptionLine(
  periodYear: number | null,
  periodMonth: number | null,
): string | null {
  if (!periodYear || !periodMonth) return null;
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(periodYear, periodMonth - 1, 1)));
  return `Prestations de services exécutées sur la période : ${label}.`;
}

export type MissingMention =
  | "legalForm"
  | "shareCapital"
  | "rcsCity"
  | "siret"
  | "vatNumber"
  | "iban";

const MISSING_LABELS: Record<MissingMention, string> = {
  legalForm: "forme juridique",
  shareCapital: "capital social",
  rcsCity: "ville du RCS",
  siret: "SIRET",
  vatNumber: "numéro de TVA intracommunautaire",
  iban: "IBAN (sans lui, le client n'a aucun moyen de payer)",
};

/**
 * Ce qui manque pour qu'une facture soit conforme. Verifie avant emission,
 * pas apres : une facture emise ne se corrige que par un avoir.
 */
export function missingLegalMentions(company: CompanyLegalIdentity): MissingMention[] {
  const missing: MissingMention[] = [];
  if (!company.legalForm) missing.push("legalForm");
  if (company.shareCapital === null) missing.push("shareCapital");
  if (!company.rcsCity) missing.push("rcsCity");
  if (!company.siret) missing.push("siret");
  if (!company.vatNumber) missing.push("vatNumber");
  if (!company.iban) missing.push("iban");
  return missing;
}

export function describeMissingMentions(missing: MissingMention[]): string {
  return missing.map((key) => MISSING_LABELS[key]).join(", ");
}

// Les Decimal Prisma ne sont pas des nombres JavaScript : conversion explicite
// a la frontiere, pour que les regles de mentions legales restent pures.
export function companyProfileToLegalIdentity(company: CompanyProfile): CompanyLegalIdentity {
  return {
    legalName: company.legalName,
    address: company.address,
    legalForm: company.legalForm,
    shareCapital: company.shareCapital === null ? null : Number(company.shareCapital),
    rcsCity: company.rcsCity,
    siret: company.siret,
    vatNumber: company.vatNumber,
    iban: company.iban,
    latePenaltyRate: company.latePenaltyRate === null ? null : Number(company.latePenaltyRate),
  };
}

function formatEuros(amount: number): string {
  return `${amount.toFixed(2).replace(".", ",")} €`;
}

function formatPercent(rate: number): string {
  return `${rate.toFixed(2).replace(".", ",")} %`;
}
