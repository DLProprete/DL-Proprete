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

// Champ numerique facultatif : un input vide arrive en "" dans le FormData,
// z.coerce.number() le transformerait en 0 — un capital social a 0 € ou un
// taux de penalites a 0 % seraient tous les deux faux et silencieux.
const optionalDecimal = z
  .union([z.literal(""), z.coerce.number().nonnegative()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

export const companyProfileInputSchema = z.object({
  legalName: z.string().min(1, "Raison sociale requise"),
  address: z.string().min(1, "Adresse requise"),
  legalForm: z.string().optional(),
  shareCapital: optionalDecimal,
  rcsCity: z.string().optional(),
  siret: z.string().optional(),
  vatNumber: z.string().optional(),
  iban: z.union([ibanSchema, z.literal("")]).optional(),
  latePenaltyRate: optionalDecimal,
  reminderWindowDays: z.coerce.number().int().positive(),
});

export type CompanyProfileInput = z.infer<typeof companyProfileInputSchema>;
