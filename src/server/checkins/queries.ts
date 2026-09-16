import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

// Fenêtre "agent actif sur ce site" (dernier pointage validé) et fenêtre de
// fraîcheur du point d'information — codées en dur pour cette v1, comme les
// seuils de src/server/reports/alerts.ts.
const ACTIVITY_WINDOW_DAYS = 60;
const CHECK_IN_FRESHNESS_DAYS = 30;

export async function listCheckInsForSite(user: SessionUser, siteId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.agentSiteCheckIn.findMany({
    where: { siteId },
    orderBy: { occurredOn: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true } },
      author: { select: { firstName: true, lastName: true } },
    },
  });
}

export type OverdueAgent = {
  userId: string;
  agentName: string;
  lastCheckInOn: Date | null;
};

// Un agent est "actif sur ce site" s'il y a pointé (VALIDATED) récemment —
// pas de modèle d'affectation agent/site fixe dans le schéma actuel. En
// retard si aucun point d'information dans les CHECK_IN_FRESHNESS_DAYS
// derniers jours (ou jamais).
export async function getOverdueAgentsForSite(user: SessionUser, siteId: string): Promise<OverdueAgent[]> {
  requireRole(user, [...MANAGE_ROLES]);
  const now = Date.now();
  const activitySince = new Date(now - ACTIVITY_WINDOW_DAYS * 86_400_000);
  const freshSince = new Date(now - CHECK_IN_FRESHNESS_DAYS * 86_400_000);

  const [activeEntries, checkIns] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { siteId, status: "VALIDATED", clockInAt: { gte: activitySince } },
      distinct: ["userId"],
      select: { userId: true, user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.agentSiteCheckIn.findMany({
      where: { siteId },
      orderBy: { occurredOn: "desc" },
      select: { userId: true, occurredOn: true },
    }),
  ]);

  const lastCheckInByAgent = new Map<string, Date>();
  for (const checkIn of checkIns) {
    if (!lastCheckInByAgent.has(checkIn.userId)) lastCheckInByAgent.set(checkIn.userId, checkIn.occurredOn);
  }

  return activeEntries
    .map((entry) => ({
      userId: entry.userId,
      agentName: `${entry.user.firstName} ${entry.user.lastName}`,
      lastCheckInOn: lastCheckInByAgent.get(entry.userId) ?? null,
    }))
    .filter((agent) => agent.lastCheckInOn === null || agent.lastCheckInOn < freshSince);
}
