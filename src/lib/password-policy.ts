import { z } from "zod";

// Règle unique des mots de passe (création, réinitialisation, changement).
// 12 caractères minimum : la seule règle qui compte vraiment contre la
// force brute. Pas d'exigence de caractères spéciaux : les mots de passe
// générés par le trousseau Apple ou Google la dépassent largement.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `${PASSWORD_MIN_LENGTH} caractères minimum`)
  .max(PASSWORD_MAX_LENGTH, `${PASSWORD_MAX_LENGTH} caractères maximum`);

// Attribut non standard lu par Safari / trousseau iCloud pour générer un
// mot de passe conforme. Hors des types React : passé par décomposition.
export const PASSWORD_RULES_ATTRIBUTE: Record<string, string> = {
  passwordrules: `minlength: ${PASSWORD_MIN_LENGTH}; maxlength: ${PASSWORD_MAX_LENGTH};`,
};
