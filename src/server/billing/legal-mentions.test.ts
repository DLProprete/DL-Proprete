import { describe, expect, it } from "vitest";
import {
  clientIdentityLines,
  describeMissingMentions,
  missingLegalMentions,
  paymentTermsLines,
  sellerIdentityLines,
  serviceDescriptionLine,
  sirenFromSiret,
  RECOVERY_INDEMNITY_EUR,
} from "./legal-mentions";

const company = {
  legalName: "DL PROPRETE",
  address: "3 rue de Verdun, 14460 Colombelles",
  legalForm: "SAS",
  shareCapital: 10000,
  rcsCity: "Caen",
  siret: "53173924100044",
  vatNumber: "FR64531739241",
  iban: "FR7630001007941234567890185",
  latePenaltyRate: null,
};

describe("identification du vendeur", () => {
  it("porte forme juridique, capital et RCS", () => {
    const lines = sellerIdentityLines(company);
    expect(lines.join("\n")).toContain("SAS — au capital de 10000,00 € — RCS Caen 531739241");
    expect(lines.join("\n")).toContain("SIRET 53173924100044");
    expect(lines.join("\n")).toContain("TVA intracommunautaire FR64531739241");
  });

  it("dérive le SIREN des neuf premiers chiffres du SIRET", () => {
    expect(sirenFromSiret("53173924100044")).toBe("531739241");
    expect(sirenFromSiret("531 739 241 00044")).toBe("531739241");
    expect(sirenFromSiret(null)).toBeNull();
    expect(sirenFromSiret("1234")).toBeNull();
  });

  it("n'invente rien quand un champ manque", () => {
    const lines = sellerIdentityLines({ ...company, legalForm: null, rcsCity: null });
    expect(lines.join("\n")).not.toContain("RCS");
    expect(lines.join("\n")).toContain("au capital de");
  });
});

describe("identification du client", () => {
  it("porte le numéro de TVA du preneur, obligatoire en B2B", () => {
    const lines = clientIdentityLines({
      legalName: "Client Démo SARL",
      billingAddress: "1 rue de la Démo, 14000 Caen",
      siret: "12345678900011",
      vatNumber: "FR00123456789",
    });
    expect(lines.join("\n")).toContain("TVA intracommunautaire FR00123456789");
  });
});

describe("conditions de règlement", () => {
  it("ne dit plus qu'aucune pénalité n'est due (régression : mention juridiquement fausse)", () => {
    const text = paymentTermsLines(company, 30).join(" ");
    expect(text).not.toContain("Aucune pénalité");
    expect(text).toContain("de plein droit");
  });

  it("porte l'indemnité forfaitaire de 40 € et l'absence d'escompte", () => {
    const text = paymentTermsLines(company, 30).join(" ");
    expect(RECOVERY_INDEMNITY_EUR).toBe(40);
    expect(text).toContain("40,00 €");
    expect(text).toContain("L441-10");
    expect(text).toContain("Pas d'escompte");
  });

  it("reprend le délai de paiement du client", () => {
    expect(paymentTermsLines(company, 45).join(" ")).toContain("à 45 jours");
  });

  it("annonce le taux contractuel quand il est paramétré, le repli légal sinon", () => {
    expect(paymentTermsLines({ ...company, latePenaltyRate: 12.5 }, 30).join(" ")).toContain(
      "taux annuel de 12,50 %",
    );
    expect(paymentTermsLines(company, 30).join(" ")).toContain("trois fois le taux d'intérêt légal");
  });
});

describe("période d'exécution", () => {
  it("indique le mois de réalisation, distinct de la date d'émission", () => {
    expect(serviceDescriptionLine(2026, 8)).toContain("août 2026");
  });

  it("reste silencieuse sur une facture hors période", () => {
    expect(serviceDescriptionLine(null, null)).toBeNull();
  });
});

describe("contrôle avant émission", () => {
  it("ne signale rien sur un paramétrage complet", () => {
    expect(missingLegalMentions(company)).toEqual([]);
  });

  it("liste ce qui manque, IBAN compris", () => {
    const missing = missingLegalMentions({
      ...company,
      legalForm: null,
      shareCapital: null,
      iban: null,
    });
    expect(missing).toEqual(["legalForm", "shareCapital", "iban"]);
    expect(describeMissingMentions(missing)).toContain("forme juridique");
    expect(describeMissingMentions(missing)).toContain("IBAN");
  });
});
