import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { createQuote } from "./actions";

// Avant cette validation, une ligne avec un prix négatif ou une quantité non
// numérique était silencieusement transformée en 0 plutôt que rejetée — le
// devis se créait quand même avec des montants faux (voir revue de sécurité :
// "Valider les entrées (Zod) aux frontières" ne l'était pas ici).
describe("createQuote — validation des lignes (intégration DB)", () => {
  const suffix = Date.now();
  let prospectId: string;
  let adminUser: SessionUser;
  let createdQuoteId: string | null = null;

  beforeAll(async () => {
    const prospect = await prisma.prospect.create({
      data: { legalName: `Prospect Test Quote ${suffix}` },
    });
    const admin = await prisma.user.create({
      data: {
        email: `test-quote-admin-${suffix}@dlproprete.fr`,
        name: "Admin Quote",
        firstName: "Admin",
        lastName: "Quote",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    prospectId = prospect.id;
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    if (createdQuoteId) {
      await prisma.quoteLine.deleteMany({ where: { quoteId: createdQuoteId } });
      await prisma.quote.delete({ where: { id: createdQuoteId } });
    }
    await prisma.prospect.delete({ where: { id: prospectId } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  });

  it("rejette un prix unitaire négatif au lieu de le transformer en 0", async () => {
    await expect(
      createQuote(adminUser, prospectId, {
        lines: [{ label: "Ligne test", quantity: "2", unitPriceHT: "-50", vatRate: "20" }],
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("accepte une ligne valide et calcule les totaux", async () => {
    const quote = await createQuote(adminUser, prospectId, {
      lines: [{ label: "Ligne test", quantity: "2", unitPriceHT: "50", vatRate: "20" }],
    });
    createdQuoteId = quote.id;
    expect(Number(quote.amountHT)).toBe(100);
  });
});
