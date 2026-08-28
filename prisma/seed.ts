import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { createServiceTemplate } from "@/server/service-templates/actions";
import { generateShifts } from "@/server/planning/generate-shifts";
import { assignAgent } from "@/server/planning/assignments";
import { dateOnlyUTC, parisToday } from "@/lib/dates";
import type { SessionUser } from "@/server/auth/session";

const prisma = new PrismaClient();

// "local:credential" est l'issuer synthétique que Better Auth utilise pour
// retrouver le compte email+mot de passe d'un utilisateur (voir
// @better-auth/core/db/schema/account — createLocalAccountIssuer). Le seed
// insère directement User + Account car src/lib/auth.ts a
// `disableSignUp: true` : auth.api.signUpEmail est désactivé (ADMIN
// uniquement crée les comptes, cf. docs/ARCHITECTURE.md section 0), donc
// il ne peut pas servir à peupler la base de démo.
const CREDENTIAL_ISSUER = "local:credential";
const SEED_PASSWORD = "changeme123";

async function createUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "PLANNER" | "AGENT";
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { role: input.role },
    create: {
      email: input.email,
      name: `${input.firstName} ${input.lastName}`,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      emailVerified: true,
    },
  });

  const password = await hashPassword(SEED_PASSWORD);
  await prisma.account.upsert({
    where: { issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: user.id } },
    update: { password },
    create: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      issuer: CREDENTIAL_ISSUER,
      password,
    },
  });

  return user;
}

async function main() {
  const admin = await createUser({
    email: "admin@dlproprete.fr",
    firstName: "Direction",
    lastName: "DL Propreté",
    role: "ADMIN",
  });

  const agent1 = await createUser({
    email: "agent1@dlproprete.fr",
    firstName: "Agent",
    lastName: "Un",
    role: "AGENT",
  });

  const agent2 = await createUser({
    email: "agent2@dlproprete.fr",
    firstName: "Agent",
    lastName: "Deux",
    role: "AGENT",
  });

  const client = await prisma.client.upsert({
    where: { id: "seed-client-demo" },
    update: {},
    create: {
      id: "seed-client-demo",
      legalName: "Client Démo SARL",
      billingAddress: "1 rue de la Démo, 14000 Caen",
      email: "contact@client-demo.fr",
    },
  });

  const site = await prisma.site.upsert({
    where: { id: "seed-site-demo" },
    update: {},
    create: {
      id: "seed-site-demo",
      clientId: client.id,
      name: "Site Démo",
      address: "1 rue de la Démo",
      city: "Caen",
      postalCode: "14000",
    },
  });

  const contract = await prisma.contract.upsert({
    where: { id: "seed-contract-demo" },
    update: {},
    create: {
      id: "seed-contract-demo",
      clientId: client.id,
      siteId: site.id,
      reference: "C-DEMO-001",
      startsOn: new Date("2026-01-01"),
      endsOn: new Date("2026-12-31"),
      hourlyRateHT: 25,
      status: "ACTIVE",
    },
  });

  // Vacation type + planning de démo, pour que l'écran AGENT ait toujours
  // quelque chose à afficher après un `prisma migrate reset` (cf. SPEC
  // Session 1 : "une semaine de planning" dans le seed, oublié à l'époque).
  const adminSession: SessionUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };

  let template = await prisma.serviceTemplate.findFirst({
    where: {
      contractId: contract.id,
      daysOfWeek: { equals: [1, 2, 3, 4, 5] },
      durationMinutes: 120,
      requiredAgents: 1,
    },
  });
  if (!template) {
    template = await createServiceTemplate(adminSession, {
      contractId: contract.id,
      name: "Entretien quotidien bureaux",
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "06:00",
      endTime: "08:00",
      durationMinutes: 120,
      requiredAgents: 1,
    });
  }

  await generateShifts(adminSession);

  const today = parisToday();
  const todayDate = dateOnlyUTC(today.year, today.month, today.day);
  const todayShift = await prisma.shift.findFirst({
    where: { contractId: contract.id, serviceTemplateId: template.id, date: todayDate },
  });

  if (todayShift) {
    const alreadyAssigned = await prisma.assignment.findFirst({
      where: { shiftId: todayShift.id, userId: agent1.id, status: "ASSIGNED" },
    });
    if (!alreadyAssigned) {
      await assignAgent(adminSession, todayShift.id, agent1.id);
    }
  }

  // Deux pointages de démo "de la veille" (approximatif, pas de rigueur
  // Europe/Paris ici — c'est de la donnée de démo, pas un calcul métier) :
  // un à valider, un déjà validé, pour que /time-entries ait du contenu.
  const yesterdayClockIn = new Date();
  yesterdayClockIn.setDate(yesterdayClockIn.getDate() - 1);
  yesterdayClockIn.setHours(6, 0, 0, 0);
  const yesterdayClockOut = new Date(yesterdayClockIn.getTime() + 2 * 60 * 60 * 1000);

  await prisma.timeEntry.upsert({
    where: { id: "seed-time-entry-1" },
    update: {},
    create: {
      id: "seed-time-entry-1",
      userId: agent1.id,
      siteId: site.id,
      clockInAt: yesterdayClockIn,
      clockOutAt: yesterdayClockOut,
      status: "SUBMITTED",
    },
  });

  await prisma.timeEntry.upsert({
    where: { id: "seed-time-entry-2" },
    update: {},
    create: {
      id: "seed-time-entry-2",
      userId: agent2.id,
      siteId: site.id,
      clockInAt: new Date(yesterdayClockIn.getTime() + 3 * 60 * 60 * 1000),
      clockOutAt: new Date(yesterdayClockOut.getTime() + 3 * 60 * 60 * 1000),
      status: "VALIDATED",
      validatedById: admin.id,
      validatedAt: new Date(),
    },
  });

  console.log({
    admin: admin.email,
    agents: [agent1.email, agent2.email],
    client: client.legalName,
    site: site.name,
    contract: contract.reference,
    seedPassword: SEED_PASSWORD,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
