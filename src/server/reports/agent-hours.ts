import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { monthRange } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN"] as const;

// Semaines/mois moyen (52/12) — approximation standard, pas de prorata sur
// les jours ouvrés réels du mois (même niveau de simplification que les
// absences dans trends.ts).
const WEEKS_PER_MONTH = 52 / 12;

export type AgentHoursUtilization = {
  userId: string;
  agentName: string;
  contractualHours: number | null;
  validatedHours: number;
  deltaHours: number | null;
};

// Heures réalisées (VALIDATED, durée planifiée si pointage lié à un shift —
// même règle que margins.ts/getValidatedHoursForContractMonth) vs heures
// contractuelles (weeklyContractHours x semaines/mois), par agent actif.
export async function getAgentHoursUtilization(user: SessionUser, year: number, month: number): Promise<AgentHoursUtilization[]> {
  requireRole(user, [...MANAGE_ROLES]);
  const { start, end } = monthRange(year, month);

  const [agents, entries] = await Promise.all([
    prisma.user.findMany({
      where: { role: "AGENT", isActive: true },
      select: { id: true, firstName: true, lastName: true, weeklyContractHours: true },
    }),
    prisma.timeEntry.findMany({
      where: { status: "VALIDATED", clockInAt: { gte: start, lt: end } },
      select: {
        userId: true,
        clockInAt: true,
        clockOutAt: true,
        shift: { select: { startAt: true, endAt: true } },
      },
    }),
  ]);

  const minutesByAgent = new Map<string, number>();
  for (const entry of entries) {
    const minutes = entry.shift
      ? (entry.shift.endAt.getTime() - entry.shift.startAt.getTime()) / 60_000
      : entry.clockOutAt
        ? (entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 60_000
        : 0;
    minutesByAgent.set(entry.userId, (minutesByAgent.get(entry.userId) ?? 0) + minutes);
  }

  return agents.map((agent) => {
    const validatedHours = (minutesByAgent.get(agent.id) ?? 0) / 60;
    const contractualHours = agent.weeklyContractHours != null ? Number(agent.weeklyContractHours) * WEEKS_PER_MONTH : null;
    return {
      userId: agent.id,
      agentName: `${agent.firstName} ${agent.lastName}`,
      contractualHours,
      validatedHours,
      deltaHours: contractualHours != null ? validatedHours - contractualHours : null,
    };
  });
}
