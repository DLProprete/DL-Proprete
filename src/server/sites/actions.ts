import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireRole, type SessionUser } from "@/server/auth/session";
import { siteInputSchema } from "@/lib/zod/site";
import { sendEmail } from "@/lib/email";
import { agentHasWorkedAtSite } from "./access";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

function emptyToNull<T extends Record<string, unknown>>(data: T) {
  const next = { ...data };
  for (const key of Object.keys(next)) {
    if (next[key] === "") (next as Record<string, unknown>)[key] = undefined;
  }
  return next;
}

export async function createSite(user: SessionUser, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = emptyToNull(siteInputSchema.parse(input));
  return prisma.site.create({ data });
}

export async function updateSite(user: SessionUser, id: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const parsed = emptyToNull(siteInputSchema.parse(input));
  // clientId volontairement exclu : un site ne change pas de client via ce formulaire.
  const { clientId: _clientId, ...data } = parsed;
  void _clientId;
  return prisma.site.update({ where: { id }, data });
}

export async function setSiteActive(user: SessionUser, id: string, isActive: boolean) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.site.update({ where: { id }, data: { isActive } });
}

export async function createSiteLog(
  user: SessionUser,
  input: { siteId: string; type: "ANOMALY" | "EQUIPMENT" | "OTHER"; comment: string; photoPath?: string | null },
) {
  requireRole(user, ["ADMIN", "PLANNER", "AGENT"]);
  if (user.role === "AGENT" && !(await agentHasWorkedAtSite(user.id, input.siteId))) {
    throw new ForbiddenError("Vous n'intervenez pas sur ce site.");
  }
  if (!input.comment.trim()) throw new Error("Un commentaire est requis.");
  const log = await prisma.siteLog.create({
    data: {
      siteId: input.siteId,
      userId: user.id,
      type: input.type,
      comment: input.comment.trim(),
      photoPath: input.photoPath || null,
    },
    include: { site: { include: { client: true } } },
  });

  // Notification "un rapport est disponible" — jamais de lien de connexion
  // ici : le lien magique du portail (createPortalToken) expire en 15 min,
  // inadapté à un e-mail que le client peut ouvrir des heures plus tard.
  // Un échec d'envoi ne doit jamais faire échouer la saisie de l'agent.
  if (log.visibleToClient && log.site.client.email) {
    try {
      await sendEmail({
        to: log.site.client.email,
        subject: `Nouveau rapport de visite — ${log.site.name}`,
        text: `Bonjour,\n\nUn nouveau rapport de visite pour ${log.site.name} est disponible dans votre espace client DL Propreté.\n\nCordialement,\nDL Propreté`,
      });
    } catch (error) {
      console.error("[site-log] échec de la notification client :", error);
    }
  }

  return log;
}

export async function setSiteLogVisibility(
  user: SessionUser,
  logId: string,
  visibleToClient: boolean,
) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.siteLog.update({ where: { id: logId }, data: { visibleToClient } });
}
