import "dotenv/config";
import { defineConfig } from "vitest/config";
import path from "node:path";
import { assertLocalDatabase } from "./src/lib/local-database";

// Les tests d'intégration écrivent dans la base (et consomment des numéros
// de facture) : refus net si DATABASE_URL n'est pas une base locale.
assertLocalDatabase(process.env.DATABASE_URL, "npm test");

// Certains tests (règles OPEN/VALIDATED du pointage) sont des tests
// d'intégration : ils créent/nettoient leurs propres données via Prisma
// contre la base de DATABASE_URL. Nécessite un .env local avec une base
// Postgres joignable pour tourner en entier.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Les tests d'intégration partagent une seule base réelle (pas de
    // schéma/transaction isolé par fichier) : en parallèle, un test qui
    // mesure un delta (ex. CA du mois) peut lire l'écriture concurrente
    // d'un autre fichier de test. Exécution séquentielle des fichiers
    // pour éliminer cette source de flakiness — constaté en conditions
    // réelles (delta pollué de +170 sur getMonthlyRevenue).
    fileParallelism: false,
    // Fichiers des tests toujours sur le disque local (src/lib/uploads.ts),
    // jamais dans le bucket Supabase de production, même si le .env le configure.
    env: { SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" },
  },
});
