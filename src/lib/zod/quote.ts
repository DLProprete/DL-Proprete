import { z } from "zod";
import { adhocLineInputSchema } from "./invoice";

export const quoteInputSchema = z.object({
  notes: z.string().optional(),
  validUntil: z.string().optional(),
  lines: z.array(adhocLineInputSchema).min(1, "Au moins une ligne requise"),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;
