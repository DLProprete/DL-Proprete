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
    durationMinutes: z.coerce.number().int().positive("Durée invalide"),
    requiredAgents: z.coerce.number().int().min(1).default(1),
    instructions: z.string().optional(),
  })
  .refine((data) => timeToMinutes(data.endTime) > timeToMinutes(data.startTime), {
    message: "L'heure de fin doit être postérieure à l'heure de début",
    path: ["endTime"],
  });

export type ServiceTemplateInput = z.infer<typeof serviceTemplateInputSchema>;
