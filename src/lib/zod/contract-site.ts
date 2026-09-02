import { z } from "zod";

export const contractSiteInputSchema = z
  .object({
    contractId: z.string().min(1, "Contrat requis"),
    siteId: z.string().min(1, "Site requis"),
    hourlyRateHT: z.coerce.number().positive("Le tarif horaire doit être positif"),
    // Defaut = forfait mensuel lisse (decision produit du 31/08/2026) : la
    // pratique du secteur est un montant identique chaque mois, 1/12e du
    // volume annuel. CALENDAR_SHIFTS reste disponible site par site pour
    // ceux qui veulent facturer le calendrier reel.
    billingBasis: z
      .enum(["CALENDAR_SHIFTS", "FLAT_INDICATIVE_HOURS"])
      .default("FLAT_INDICATIVE_HOURS"),
    indicativeMonthlyHours: z.coerce.number().positive().optional(),
  })
  .refine((data) => data.billingBasis !== "FLAT_INDICATIVE_HOURS" || data.indicativeMonthlyHours, {
    message: "Heures mensuelles indicatives requises pour une facturation à forfait",
    path: ["indicativeMonthlyHours"],
  });

export type ContractSiteInput = z.infer<typeof contractSiteInputSchema>;
