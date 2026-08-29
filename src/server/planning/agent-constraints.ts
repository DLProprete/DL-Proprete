import { formatTime, formatTimeInParis } from "@/lib/dates";

const WEEKDAY_NAMES = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

type ConstrainedAgent = {
  firstName: string;
  lastName: string;
  maxEndTime: Date | null;
  minStartTime: Date | null;
  noWorkWeekdays: number[];
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

  if (agent.noWorkWeekdays.includes(dayOfWeek)) {
    return `${name} : jour non travaillé (${WEEKDAY_NAMES[dayOfWeek]})`;
  }

  if (agent.minStartTime) {
    const start = formatTimeInParis(shift.startAt);
    const limit = formatTime(agent.minStartTime);
    if (start < limit) {
      return `${name} : début de vacation ${start} < limite ${limit}`;
    }
  }

  if (agent.maxEndTime) {
    const end = formatTimeInParis(shift.endAt);
    const limit = formatTime(agent.maxEndTime);
    if (end > limit) {
      return `${name} : fin de vacation ${end} > limite ${limit}`;
    }
  }

  return null;
}
