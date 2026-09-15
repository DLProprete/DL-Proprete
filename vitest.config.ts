import "dotenv/config";
import { defineConfig } from "vitest/config";
import path from "node:path";

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
  },
});
