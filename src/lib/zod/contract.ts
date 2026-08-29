import { z } from "zod";

export const contractInputSchema = z
  .object({
    siteId: z.string().min(1, "Site requis"),
    reference: z.string().min(1, "Référence requise"),
    startsOn: z.coerce.date(),
    endsOn: z.coerce.date(),
    hourlyRateHT: z.coerce.number().positive("Le tarif horaire doit être positif"),
    status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT"),
    billingBasis: z.enum(["CALENDAR_SHIFTS", "FLAT_INDICATIVE_HOURS"]).default("CALENDAR_SHIFTS"),
    indicativeMonthlyHours: z.coerce.number().positive().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.endsOn > data.startsOn, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endsOn"],
  })
  .refine((data) => data.billingBasis !== "FLAT_INDICATIVE_HOURS" || data.indicativeMonthlyHours, {
    message: "Heures mensuelles indicatives requises pour une facturation à forfait",
    path: ["indicativeMonthlyHours"],
  });

export type ContractInput = z.infer<typeof contractInputSchema>;
