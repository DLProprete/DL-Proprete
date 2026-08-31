import { z } from "zod";

const timeRegex = /^\d{2}:\d{2}$/;
const optionalTime = z.union([z.string().regex(timeRegex, "Heure invalide"), z.literal("")]).optional();

export const agentProfileSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().optional(),
  // Même piège que homeLat/homeLng : "" ne doit pas coercer vers 0 (0h/semaine
  // serait faux et silencieux, pas "non renseigné").
  weeklyContractHours: z.union([z.literal(""), z.coerce.number().nonnegative()]).optional(),
  homeAddress: z.string().optional(),
  homeCity: z.string().optional(),
  homePostalCode: z.string().optional(),
  // z.literal("") doit être tenté avant la coercion numérique : Number("")
  // vaut 0, donc un champ vide matcherait silencieusement la branche nombre
  // si elle passait en premier (union teste dans l'ordre, s'arrête au 1er
  // succès).
  homeLat: z.union([z.literal(""), z.coerce.number().min(-90).max(90)]).optional(),
  homeLng: z.union([z.literal(""), z.coerce.number().min(-180).max(180)]).optional(),
  hasDrivingLicense: z.coerce.boolean().default(false),
  maxEndTime: optionalTime,
  minStartTime: optionalTime,
  noWorkWeekdays: z.array(z.coerce.number().int().min(1).max(7)).optional().default([]),
  notes: z.string().optional(),
});

export const createAgentInputSchema = agentProfileSchema.extend({
  email: z.email(),
  password: z.string().min(8, "8 caractères minimum"),
  // Le rôle ne se change qu'à la création — le modifier après coup n'est
  // pas demandé (hors scope Mo6 de l'audit du 31/08/2026).
  role: z.enum(["AGENT", "PLANNER"]).default("AGENT"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "8 caractères minimum"),
});

export type AgentProfileInput = z.infer<typeof agentProfileSchema>;
export type CreateAgentInput = z.infer<typeof createAgentInputSchema>;
