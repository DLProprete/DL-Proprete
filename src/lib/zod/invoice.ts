import { z } from "zod";

export const adhocLineInputSchema = z.object({
  label: z.string().min(1, "Libellé requis"),
  quantity: z.coerce.number().positive("Quantité invalide"),
  unitPriceHT: z.coerce.number().positive("Prix unitaire invalide"),
  vatRate: z.coerce.number().min(0).max(100).default(20),
});

export type AdhocLineInput = z.infer<typeof adhocLineInputSchema>;

export const paymentInputSchema = z.object({
  paidOn: z.coerce.date(),
  amount: z.coerce.number().positive("Montant invalide"),
  method: z.enum(["TRANSFER", "CHEQUE", "CASH", "OTHER"]),
  reference: z.string().optional(),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

export const reminderInputSchema = z.object({
  remindedOn: z.coerce.date(),
  note: z.string().max(200, "200 caractères maximum").optional(),
});

export type ReminderInput = z.infer<typeof reminderInputSchema>;
