import { z } from "zod";
import { passwordSchema } from "@/lib/password-policy";

export const changeMyEmailSchema = z.object({
  email: z.string().email("E-mail invalide"),
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
});

export const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: passwordSchema,
});
