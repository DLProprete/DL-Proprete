import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const checkInSchema = z.object({
  userId: z.string().min(1, "Agent requis"),
  occurredOn: z.string().regex(dateRegex, "Date invalide"),
  note: z.string().min(1, "Note requise"),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
