import { formatDateOnly, formatTimeInParis } from "@/lib/dates";

const WEEKDAY_NAMES = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export type ScheduleException = { weekdays: number[]; notBefore?: string; notAfter?: string };

type ConstrainedAgent = {
  firstName: string;
  lastName: string;
  scheduleExceptions?: unknown;
  contractType?: "CDI" | "CDD" | null;
  contractEndDate?: Date | null;
};

type ConstrainedShift = {
  date: Date;
  startAt: Date;
  endAt: Date;
};

// ponytail: compare les heures murales de startAt/endAt sans gérer le cas
// d'une vacation à cheval sur minuit (l'heure de fin afficherait alors une
// heure du petit matin, sous la limite) — aucun cas réel identifié
// aujourd'hui ; à revoir si des vacations de nuit apparaissent.
export function agentConstraintViolation(
  agent: ConstrainedAgent,
  shift: ConstrainedShift,
): string | null {
  const name = `${agent.firstName} ${agent.lastName}`;
  const weekday = shift.date.getUTCDay();
  const dayOfWeek = weekday === 0 ? 7 : weekday;

  if (agent.contractType === "CDD" && agent.contractEndDate && shift.date > agent.contractEndDate) {
    return `${name} : contrat CDD terminé le ${formatDateOnly(agent.contractEndDate)}`;
  }

  // scheduleExceptions n'est écrit que via le formulaire agent, déjà validé
  // par zod à la frontière (src/lib/zod/agent.ts) — pas une donnée externe
  // à revalider ici, simple cast (contrairement à parseGeocodingResponse,
  // qui interprète une réponse Google non maîtrisée).
  const exceptions = (agent.scheduleExceptions as ScheduleException[] | null) ?? [];

  for (const exception of exceptions) {
    if (!exception.weekdays.includes(dayOfWeek)) continue;

    if (!exception.notBefore && !exception.notAfter) {
      return `${name} : jour non travaillé (${WEEKDAY_NAMES[dayOfWeek]})`;
    }

    if (exception.notBefore) {
      const start = formatTimeInParis(shift.startAt);
      if (start < exception.notBefore) {
        return `${name} : début de vacation ${start} < limite ${exception.notBefore} (${WEEKDAY_NAMES[dayOfWeek]})`;
      }
    }

    if (exception.notAfter) {
      const end = formatTimeInParis(shift.endAt);
      if (end > exception.notAfter) {
        return `${name} : fin de vacation ${end} > limite ${exception.notAfter} (${WEEKDAY_NAMES[dayOfWeek]})`;
      }
    }
  }

  return null;
}
