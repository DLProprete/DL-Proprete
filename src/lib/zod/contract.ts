import { z } from "zod";

// Cadre legal pur : ce qui varie par site (tarif, base de facturation,
// volume indicatif) vit dans contractSiteInputSchema, pas ici.
export const contractInputSchema = z
  .object({
    clientId: z.string().min(1, "Client requis"),
    reference: z.string().min(1, "Référence requise"),
    startsOn: z.coerce.date(),
    endsOn: z.coerce.date(),
    status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT"),
    notes: z.string().optional(),
  })
  .refine((data) => data.endsOn > data.startsOn, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endsOn"],
  });

export type ContractInput = z.infer<typeof contractInputSchema>;
