import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { createAgent, resetAgentPassword, setAgentActive, updateAgentProfile } from "./actions";
import { getAgent, listTeam } from "./queries";

const validInput = {
  firstName: "Nouvel",
  lastName: "Agent",
  email: "nouvel.agent@dlproprete.fr",
  password: "changeme123",
};

function user(role: SessionUser["role"]): SessionUser {
  return { id: "u1", email: "u1@dlproprete.fr", role, isActive: true };
}

describe("droits Équipe — ADMIN uniquement", () => {
  it("createAgent rejette un PLANNER", async () => {
    await expect(createAgent(user("PLANNER"), validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("createAgent rejette un AGENT", async () => {
    await expect(createAgent(user("AGENT"), validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updateAgentProfile rejette un PLANNER", async () => {
    await expect(
      updateAgentProfile(user("PLANNER"), "any-id", { firstName: "A", lastName: "B" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("setAgentActive rejette un PLANNER", async () => {
    await expect(setAgentActive(user("PLANNER"), "any-id", false)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("resetAgentPassword rejette un PLANNER", async () => {
    await expect(
      resetAgentPassword(user("PLANNER"), "any-id", { password: "changeme123" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listTeam rejette un PLANNER", async () => {
    await expect(listTeam(user("PLANNER"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getAgent rejette un AGENT", async () => {
    await expect(getAgent(user("AGENT"), "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("déconnexion d'un agent désactivé ou réinitialisé (intégration DB)", () => {
  const suffix = Date.now();
  let admin: SessionUser;
  let agentId: string;

  beforeAll(async () => {
    const make = (label: string, role: "ADMIN" | "AGENT") =>
      prisma.user.create({
        data: {
          email: `test-team-sessions-${label}-${suffix}@dlproprete.fr`,
          name: label,
          firstName: label,
          lastName: "Test",
          role,
          emailVerified: true,
        },
      });
    const adminRow = await make("admin", "ADMIN");
    admin = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };
    agentId = (await make("agent", "AGENT")).id;
  });

  afterAll(async () => {
    const users = { email: { endsWith: `-${suffix}@dlproprete.fr` } };
    await prisma.auditLog.deleteMany({ where: { actorUserId: admin.id } });
    await prisma.session.deleteMany({ where: { user: users } });
    await prisma.account.deleteMany({ where: { user: users } });
    await prisma.user.deleteMany({ where: users });
  });

  const openSession = (label: string) =>
    prisma.session.create({
      data: {
        userId: agentId,
        token: `test-team-sessions-${label}-${suffix}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

  it("resetAgentPassword supprime toutes les sessions de l'agent", async () => {
    await openSession("reset");
    await resetAgentPassword(admin, agentId, { password: "nouveaumotdepasse123" });
    expect(await prisma.session.count({ where: { userId: agentId } })).toBe(0);
  });

  it("setAgentActive(false) supprime toutes les sessions de l'agent", async () => {
    await openSession("desactivation");
    await setAgentActive(admin, agentId, false);
    expect(await prisma.session.count({ where: { userId: agentId } })).toBe(0);
  });
});
