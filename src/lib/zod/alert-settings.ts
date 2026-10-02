import { z } from "zod";

// Champ vide = retour à la variable d'environnement (null en base).
const emptyToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

export const alertSettingsSchema = z.object({
  errorAlertEmail: z.preprocess(emptyToNull, z.email("Adresse e-mail invalide.").trim().nullable()),
  // Nom affiché seulement (l'adresse reste la boîte SMTP). Sans < > " ni
  // retour à la ligne : ils permettraient d'injecter un autre expéditeur.
  mailFromName: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(80, "Nom d'expéditeur : 80 caractères maximum.")
      .refine((value) => !/[<>"\r\n]/.test(value), "Nom d'expéditeur : caractères < > \" et retours à la ligne interdits.")
      .nullable(),
  ),
});
