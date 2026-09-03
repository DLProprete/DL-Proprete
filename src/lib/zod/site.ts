import { z } from "zod";

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
});

export type SiteInput = z.infer<typeof siteInputSchema>;
