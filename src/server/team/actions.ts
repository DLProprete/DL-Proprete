import { prisma } from "@/lib/prisma";
import { hashPassword } from "better-auth/crypto";
import { requireRole, type SessionUser } from "@/server/auth/session";
import {
  agentProfileSchema,
  createAgentInputSchema,
  resetPasswordSchema,
  type AgentProfileInput,
} from "@/lib/zod/agent";
import { timeStringToDate } from "@/lib/dates";
import { logAudit } from "@/server/audit/log";
import { geocodeAddress } from "@/lib/geocoding";

const MANAGE_ROLES = ["ADMIN"] as const;
// Rôles gérés depuis /team (Mo6) — pas ADMIN, dont la création n'est pas
// demandée par l'audit et reste hors de ce formulaire.
const MANAGED_MEMBER_ROLES = ["AGENT", "PLANNER"] as const;

// Même issuer synthétique que prisma/seed.ts — voir sa note pour le détail
// (Better Auth utilise (issuer, accountId) pour retrouver le compte).
const CREDENTIAL_ISSUER = "local:credential";

// Géocode l'adresse du domicile uniquement si elle a changé depuis la
// valeur actuelle — même souci qu'updateSite (src/server/sites/actions.ts) :
// ne pas payer un appel Google Maps à chaque sauvegarde du profil quand
// seule une autre info (notes, horaires...) a changé.
async function resolveHomeCoordinates(
  data: AgentProfileInput,
  current: { homeAddress: string | null; homeCity: string | null; homePostalCode: string | null } | null,
) {
  const homeAddress = data.homeAddress || null;
  const homeCity = data.homeCity || null;
  const homePostalCode = data.homePostalCode || null;
  if (!homeAddress) return { homeLat: null, homeLng: null };

  const unchanged =
    current?.homeAddress === homeAddress &&
    current?.homeCity === homeCity &&
    current?.homePostalCode === homePostalCode;
  if (unchanged) return {};

  const coordinates = await geocodeAddress(`${homeAddress}, ${homePostalCode ?? ""} ${homeCity ?? ""}`);
  return { homeLat: coordinates?.lat ?? null, homeLng: coordinates?.lng ?? null };
}

async function toProfileData(
  data: AgentProfileInput,
  current: { homeAddress: string | null; homeCity: string | null; homePostalCode: string | null } | null = null,
) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    name: `${data.firstName} ${data.lastName}`,
    phone: data.phone || null,
    weeklyContractHours:
      data.weeklyContractHours === "" || data.weeklyContractHours === undefined
        ? null
        : data.weeklyContractHours,
    paidLeaveBalance:
      data.paidLeaveBalance === "" || data.paidLeaveBalance === undefined ? null : data.paidLeaveBalance,
    homeAddress: data.homeAddress || null,
    homeCity: data.homeCity || null,
    homePostalCode: data.homePostalCode || null,
    ...(await resolveHomeCoordinates(data, current)),
    hasDrivingLicense: data.hasDrivingLicense,
    experienceLevel: data.experienceLevel || null,
    maxEndTime: data.maxEndTime ? timeStringToDate(data.maxEndTime) : null,
    minStartTime: data.minStartTime ? timeStringToDate(data.minStartTime) : null,
    noWorkWeekdays: data.noWorkWeekdays,
    notes: data.notes || null,
  };
}

export async function createAgent(user: SessionUser, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = createAgentInputSchema.parse(input);

  const agent = await prisma.user.create({
    data: { email: data.email, role: data.role, emailVerified: true, ...(await toProfileData(data)) },
  });

  const password = await hashPassword(data.password);
  await prisma.account.create({
    data: {
      userId: agent.id,
      accountId: agent.id,
      providerId: "credential",
      issuer: CREDENTIAL_ISSUER,
      password,
    },
  });

  await logAudit(prisma, {
    actorUserId: user.id,
    action: "AGENT_CREATED",
    entityType: "User",
    entityId: agent.id,
    summary: `${agent.role === "PLANNER" ? "Planificateur" : "Agent"} créé : ${agent.firstName} ${agent.lastName} (${agent.email})`,
  });

  return agent;
}

export async function updateAgentProfile(user: SessionUser, id: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = agentProfileSchema.parse(input);
  const current = await prisma.user.findUnique({
    where: { id },
    select: { homeAddress: true, homeCity: true, homePostalCode: true },
  });
  return prisma.user.update({
    where: { id, role: { in: [...MANAGED_MEMBER_ROLES] } },
    data: await toProfileData(data, current),
  });
}

export async function setAgentActive(user: SessionUser, id: string, isActive: boolean) {
  requireRole(user, [...MANAGE_ROLES]);
  const agent = await prisma.user.update({
    where: { id, role: { in: [...MANAGED_MEMBER_ROLES] } },
    data: { isActive },
  });
  if (!isActive) {
    await logAudit(prisma, {
      actorUserId: user.id,
      action: "AGENT_DEACTIVATED",
      entityType: "User",
      entityId: id,
      summary: `Agent désactivé : ${agent.firstName} ${agent.lastName}`,
    });
  }
  return agent;
}

export async function resetAgentPassword(user: SessionUser, id: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const { password } = resetPasswordSchema.parse(input);
  const agent = await prisma.user.findUniqueOrThrow({
    where: { id, role: { in: [...MANAGED_MEMBER_ROLES] } },
    select: { firstName: true, lastName: true },
  });
  const hashed = await hashPassword(password);
  await prisma.account.upsert({
    where: { issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: id } },
    update: { password: hashed },
    create: { userId: id, accountId: id, providerId: "credential", issuer: CREDENTIAL_ISSUER, password: hashed },
  });
  // Jamais le mot de passe dans le résumé/metadata (règle dure).
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: id,
    summary: `Mot de passe réinitialisé : ${agent.firstName} ${agent.lastName}`,
  });
}
