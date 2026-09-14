import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const optionalDate = z.union([z.string().regex(dateRegex, "Date invalide"), z.literal("")]).optional();

export const clientInputSchema = z.object({
  legalName: z.string().min(1, "Raison sociale requise"),
  tradeName: z.string().optional(),
  siret: z.string().optional(),
  vatNumber: z.string().optional(),
  billingAddress: z.string().min(1, "Adresse de facturation requise"),
  email: z.union([z.email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  paymentTermDays: z.coerce.number().int().min(0).default(30),
  notes: z.string().optional(),
  clientSince: optionalDate,
});

export type ClientInput = z.infer<typeof clientInputSchema>;
