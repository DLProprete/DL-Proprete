import { z } from "zod";

export const changeMyEmailSchema = z.object({
  email: z.string().email("E-mail invalide"),
});

export const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(8, "8 caractères minimum"),
});
