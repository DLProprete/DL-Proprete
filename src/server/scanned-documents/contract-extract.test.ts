import { describe, expect, it } from "vitest";
import { classifyDocument, contractState, suggestContractFields } from "./contract-extract";

const CONTRAT = `CONTRAT DE PRESTATION DE NETTOYAGE
Entre les soussignés :
La société DL Propreté, SAS, 3 rue de Verdun, 14460 Colombelles, ci-après dénommée « le Prestataire »,
Et
Le syndicat des copropriétaires de la Résidence Les Tilleuls, représenté par son syndic, ci-après dénommé « le Client ».
Article 1 - Objet : entretien des parties communes situées 14 rue des Lilas, 14000 Caen.
Article 2 - Durée : le présent contrat prend effet le 1er avril 2019 pour une durée d'un an.
Il est renouvelable par tacite reconduction, sauf dénonciation avec un préavis de trois (3) mois.
Article 3 - Prix : forfait mensuel de 1 250,00 € HT, payable à réception de facture.
Fait à Colombelles, le 12 mars 2019, en deux exemplaires.`;

// Même contrat tel qu'un vieil OCR le rend : accents perdus, mois en lettres.
const CONTRAT_OCR = CONTRAT.normalize("NFD").replace(/[̀-ͯ]/g, "");

const FACTURE = `FACTURE N° F-2024-0012
Désignation : fournitures. Montant HT 100,00 € TVA 20 % Total TTC 120,00 € — Net à payer à échéance.`;

describe("classifyDocument", () => {
  it("reconnaît un contrat, une facture et un autre document", () => {
    expect(classifyDocument(CONTRAT)).toBe("CONTRAT");
    expect(classifyDocument(CONTRAT_OCR)).toBe("CONTRAT");
    expect(classifyDocument(FACTURE)).toBe("FACTURE");
    expect(classifyDocument("Note de service : réunion jeudi.")).toBe("AUTRE");
  });
});

describe("suggestContractFields", () => {
  it("extrait dates, durée, reconduction, préavis, prix et adresse du site", () => {
    const s = suggestContractFields(CONTRAT_OCR, []);
    expect(s.signedOn?.toISOString().slice(0, 10)).toBe("2019-03-12");
    expect(s.contractStartsOn?.toISOString().slice(0, 10)).toBe("2019-04-01");
    expect(s.contractEndsOn?.toISOString().slice(0, 10)).toBe("2020-03-31");
    expect(s.tacitRenewal).toBe(true);
    expect(s.noticeDays).toBe(90);
    expect(s.pricing).toContain("1 250,00");
    expect(s.siteAddresses).toContain("14 rue des Lilas");
    expect(s.siteAddresses).not.toContain("Verdun"); // l'adresse de DL Propreté n'est pas un site client
  });

  it("rapproche le client d'une fiche existante, sinon propose le nom lu", () => {
    const known = suggestContractFields(CONTRAT, [{ id: "c1", legalName: "Résidence Les Tilleuls", tradeName: null }]);
    expect(known.clientId).toBe("c1");
    const unknown = suggestContractFields(CONTRAT, []);
    expect(unknown.clientId).toBeNull();
    expect(unknown.clientNameRaw).toContain("Tilleuls");
  });

  it("lit une date de fin explicite et une absence de reconduction", () => {
    const s = suggestContractFields("Le contrat débute à compter du 01/09/2025 jusqu'au 31/08/2026, sans tacite reconduction.", []);
    expect(s.contractStartsOn?.toISOString().slice(0, 10)).toBe("2025-09-01");
    expect(s.contractEndsOn?.toISOString().slice(0, 10)).toBe("2026-08-31");
    expect(s.tacitRenewal).toBe(false);
  });

  it("résiste au bruit d'un vrai scan (extrait de sortie Tesseract)", () => {
    const scan = `Le présent contrat prend effet le 1er septembre 2025 Le - cs.
pour une durée de deux (2)ans. Le
Chaque partie peut y mettre fin avec un préavis - | |
| de trois (3) mois, par lettre recommandée. | ; ;
de 1 250;00 € HT, payable à 30 jours. 1`;
    const s = suggestContractFields(scan, []);
    expect(s.contractEndsOn?.toISOString().slice(0, 10)).toBe("2027-08-31");
    expect(s.noticeDays).toBe(90);
    expect(s.pricing).toContain("1 250;00 € HT");
  });

  it("ne propose rien plutôt qu'une valeur fausse", () => {
    const s = suggestContractFields("Texte illisible sans date ni montant.", []);
    expect(s).toMatchObject({ signedOn: null, contractStartsOn: null, contractEndsOn: null, noticeDays: null, pricing: null });
  });
});

describe("contractState", () => {
  const today = new Date(2026, 9, 2);
  it("distingue en cours, reconduit et terminé", () => {
    expect(contractState(new Date(Date.UTC(2026, 11, 31)), false, today)).toBe("EN_COURS");
    expect(contractState(new Date(Date.UTC(2020, 2, 31)), true, today)).toBe("RECONDUIT");
    expect(contractState(new Date(Date.UTC(2020, 2, 31)), false, today)).toBe("TERMINE");
    expect(contractState(null, null, today)).toBe("INCONNU");
    expect(contractState(null, true, today)).toBe("INCONNU");
  });
});
