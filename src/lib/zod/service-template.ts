import { z } from "zod";

function timeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

export const serviceTemplateInputSchema = z
  .object({
    contractId: z.string().min(1, "Contrat requis"),
    name: z.string().min(1, "Nom requis"),
    daysOfWeek: z
      .array(z.coerce.number().int().min(1).max(7))
      .min(1, "Sélectionner au moins un jour"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de début invalide"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de fin invalide"),
    // Duree reellement vendue au client. Distincte de la fenetre
    // startTime-endTime, qui est l'amplitude d'acces au site : "passage entre
    // 6 h et 8 h, 1 h 30 de prestation" est un cas courant en proprete. C'est
    // cette duree qui part en facture (voir server/billing/planned-hours.ts).
    durationMinutes: z.coerce.number().int().positive("Durée invalide"),
    requiredAgents: z.coerce.number().int().min(1).default(1),
    instructions: z.string().optional(),
  })
  .refine((data) => timeToMinutes(data.endTime) > timeToMinutes(data.startTime), {
    message: "L'heure de fin doit être postérieure à l'heure de début",
    path: ["endTime"],
  })
  // Sans ce garde-fou, l'interface acceptait "08:30-10:00 (120 min)" : une
  // duree facturee superieure a la fenetre pendant laquelle l'agent peut
  // entrer. Les deux chiffres se contredisaient sur la fiche contrat, et
  // c'est le premier que le client recompte.
  .refine(
    (data) =>
      data.durationMinutes <= timeToMinutes(data.endTime) - timeToMinutes(data.startTime),
    {
      message:
        "La durée facturée ne peut pas dépasser la fenêtre horaire de la vacation",
      path: ["durationMinutes"],
    },
  );

export type ServiceTemplateInput = z.infer<typeof serviceTemplateInputSchema>;
