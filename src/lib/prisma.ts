import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Adaptateur pg plutôt que le moteur binaire par défaut de Prisma : sur
// une fonction serverless (Vercel), charger ce binaire à chaque démarrage
// à froid coûte une part significative de la latence observée. L'adaptateur
// reste compatible avec le pooler Supabase en mode transaction (port 6543,
// voir prisma/schema.prisma) — aucun changement de DATABASE_URL nécessaire.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
