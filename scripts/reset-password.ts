// Secours : réinitialise le mot de passe d'un compte quand plus personne ne
// peut se connecter (ADMIN qui a oublié le sien, SMTP indisponible pour le
// lien « Mot de passe oublié »).
//
//   npm run password:reset -- cassandre@dlproprete.fr
//
// Cible la base de DATABASE_URL (.env local). Pour la production, passer
// l'URL sur la ligne de commande, sans jamais l'écrire dans .env :
//   DATABASE_URL="<DIRECT_URL de production>" npm run password:reset -- <email>
//
// Un mot de passe temporaire aléatoire est affiché une seule fois ; le
// changer aussitôt dans « Mon compte ». Toutes les sessions du compte sont
// fermées. Rien n'est écrit dans le dépôt ni dans un fichier.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const CREDENTIAL_ISSUER = "local:credential";

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("Usage : npm run password:reset -- <email du compte>");
    process.exit(1);
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL absente.");
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (!user) {
      console.error(`Aucun compte pour ${email}.`);
      process.exit(1);
    }

    const host = new URL(databaseUrl).hostname;
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
      `Réinitialiser le mot de passe de ${user.email} (${user.role}) sur la base « ${host} » ? Tapez oui : `,
    );
    rl.close();
    if (answer.trim().toLowerCase() !== "oui") {
      console.log("Annulé, rien n'a changé.");
      return;
    }

    const temporary = randomBytes(15).toString("base64url");
    const hashed = await hashPassword(temporary);
    await prisma.account.upsert({
      where: { issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: user.id } },
      update: { password: hashed },
      create: { userId: user.id, accountId: user.id, providerId: "credential", issuer: CREDENTIAL_ISSUER, password: hashed },
    });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    // Table absente tant que la migration login_attempts n'est pas appliquée.
    await prisma.loginAttempt
      .deleteMany({ where: { key: `email:${user.email.toLowerCase()}` } })
      .catch(() => undefined);
    await prisma.auditLog.create({
      data: {
        actorLabel: "Script de secours",
        action: "PASSWORD_RESET",
        entityType: "User",
        entityId: user.id,
        summary: `Mot de passe réinitialisé par script de secours : ${user.firstName} ${user.lastName}`,
      },
    });

    console.log(`\nMot de passe temporaire (affiché une seule fois) : ${temporary}`);
    console.log("Connectez-vous avec, puis changez-le tout de suite dans « Mon compte ».");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
