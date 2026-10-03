import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le site vit dans le dépôt de l'ERP (dossier parent, avec son propre
  // package-lock.json) : sans racine explicite, Turbopack remonte au parent
  // et ramasse src/instrumentation.ts de l'ERP (qui importe Prisma), ce qui
  // casse le build du site. Le site a ses propres dépendances.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
