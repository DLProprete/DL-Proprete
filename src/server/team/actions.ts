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

const MANAGE_ROLES = ["ADMIN"] as const;

// Même issuer synthétique que prisma/seed.ts — voir sa note pour le détail
// (Better Auth utilise (issuer, accountId) pour retrouver le compte).
const CREDENTIAL_ISSUER = "local:credential";

function toProfileData(data: AgentProfileInput) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    name: `${data.firstName} ${data.lastName}`,
    phone: data.phone || null,
    birthDate: data.birthDate || null,
    homeAddress: data.homeAddress || null,
    homeCity: data.homeCity || null,
    homePostalCode: data.homePostalCode || null,
    homeLat: data.homeLat === "" || data.homeLat === undefined ? null : data.homeLat,
    homeLng: data.homeLng === "" || data.homeLng === undefined ? null : data.homeLng,
    hasDrivingLicense: data.hasDrivingLicense,
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
    data: { email: data.email, role: "AGENT", emailVerified: true, ...toProfileData(data) },
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

  return agent;
}

export async function updateAgentProfile(user: SessionUser, id: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = agentProfileSchema.parse(input);
  return prisma.user.update({ where: { id, role: "AGENT" }, data: toProfileData(data) });
}

export async function setAgentActive(user: SessionUser, id: string, isActive: boolean) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.user.update({ where: { id, role: "AGENT" }, data: { isActive } });
}

export async function resetAgentPassword(user: SessionUser, id: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const { password } = resetPasswordSchema.parse(input);
  const hashed = await hashPassword(password);
  await prisma.account.upsert({
    where: { issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: id } },
    update: { password: hashed },
    create: { userId: id, accountId: id, providerId: "credential", issuer: CREDENTIAL_ISSUER, password: hashed },
  });
}
