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
  },
});
