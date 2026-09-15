import { describe, expect, it } from "vitest";
import { extractAmountTtc, extractDocumentDate } from "./ocr";

describe("extraction de champs par motifs — jamais de valeur inventée", () => {
  it("extrait un montant TTC avec virgule décimale", () => {
    expect(extractAmountTtc("Total TTC : 1 234,56 €")).toBe(1234.56);
  });

  it("extrait un montant TTC avec point décimal", () => {
    expect(extractAmountTtc("TOTAL TTC 42.00")).toBe(42);
  });

  it("ne renvoie rien si aucun motif de montant n'est trouvé", () => {
    expect(extractAmountTtc("Bon de commande sans montant explicite")).toBeNull();
  });

  it("extrait une date au format JJ/MM/AAAA", () => {
    const date = extractDocumentDate("Facture émise le 15/03/2024, réf ABC");
    expect(date?.toISOString().slice(0, 10)).toBe("2024-03-15");
  });

  it("ne renvoie rien si aucune date reconnaissable n'est trouvée", () => {
    expect(extractDocumentDate("Aucune date ici")).toBeNull();
  });
});
