import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

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
