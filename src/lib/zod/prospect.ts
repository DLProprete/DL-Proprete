import { z } from "zod";

export const PROSPECT_STATUSES = ["NEW", "CONTACTED", "QUOTE_SENT", "WON", "LOST"] as const;

export const prospectInputSchema = z.object({
  legalName: z.string().min(1, "Raison sociale requise"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  address: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(PROSPECT_STATUSES).default("NEW"),
  nextFollowUpAt: z.union([z.coerce.date(), z.literal("")]).optional(),
});

export type ProspectInput = z.infer<typeof prospectInputSchema>;
