import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const optionalDate = z.union([z.string().regex(dateRegex, "Date invalide"), z.literal("")]).optional();

export const siteInputSchema = z.object({
  clientId: z.string().min(1, "Client requis"),
  name: z.string().min(1, "Nom du site requis"),
  address: z.string().min(1, "Adresse requise"),
  city: z.string().min(1, "Ville requise"),
  postalCode: z.string().min(1, "Code postal requis"),
  accessNotes: z.string().optional(),
  alarmCode: z.string().optional(),
  keyNotes: z.string().optional(),
  protocolNotes: z.string().optional(),
  onSiteContactName: z.string().optional(),
  onSiteContactPhone: z.string().optional(),
  surfaceM2: z.coerce.number().positive().optional(),
  activeSince: optionalDate,
});

export type SiteInput = z.infer<typeof siteInputSchema>;
