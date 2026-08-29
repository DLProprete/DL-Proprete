import { z } from "zod";

export const absenceInputSchema = z
  .object({
    type: z.enum(["PAID_LEAVE", "RTT", "SICK", "OTHER"]),
    startsOn: z.coerce.date(),
    endsOn: z.coerce.date(),
    // Organisation uniquement — jamais de diagnostic (règle CLAUDE.md), non
    // technique : rappelée dans le libellé du champ côté UI.
    comment: z.string().max(500).optional(),
    documentPath: z.string().optional(),
  })
  .refine((data) => data.endsOn >= data.startsOn, {
    message: "La date de fin doit être postérieure ou égale à la date de début",
    path: ["endsOn"],
  })
  .refine((data) => data.type !== "SICK" || !!data.documentPath, {
    message: "Un justificatif est requis pour un arrêt maladie",
    path: ["documentPath"],
  });

export type AbsenceInput = z.infer<typeof absenceInputSchema>;
