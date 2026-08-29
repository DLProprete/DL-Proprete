import { z } from "zod";

export const serviceExceptionInputSchema = z.object({
  serviceTemplateId: z.string().min(1, "Vacation type requise"),
  date: z.coerce.date(),
  type: z.enum(["SKIP", "EXTRA"]),
  notes: z.string().optional(),
});

export type ServiceExceptionInput = z.infer<typeof serviceExceptionInputSchema>;
