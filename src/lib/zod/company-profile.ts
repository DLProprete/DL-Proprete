import { z } from "zod";

// IBAN de l'entreprise elle-même, saisi une fois par un ADMIN pour le pied
// de facture — pas une frontière de paiement : format vérifié, pas de somme
// de contrôle mod-97.
const ibanSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, "").toUpperCase())
  .refine((value) => /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(value), {
    message: "IBAN invalide",
  });

export const companyProfileInputSchema = z.object({
  legalName: z.string().min(1, "Raison sociale requise"),
  address: z.string().min(1, "Adresse requise"),
  siret: z.string().optional(),
  vatNumber: z.string().optional(),
  iban: z.union([ibanSchema, z.literal("")]).optional(),
});

export type CompanyProfileInput = z.infer<typeof companyProfileInputSchema>;
