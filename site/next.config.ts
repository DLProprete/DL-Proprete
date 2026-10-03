import path from "node:path";
import type { NextConfig } from "next";

// Mêmes en-têtes que l'ERP (next.config.ts à la racine du dépôt), sans CSP :
// le site charge Vercel Analytics, à intégrer avant d'en écrire une.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Le site vit dans le dépôt de l'ERP (dossier parent, avec son propre
  // package-lock.json) : sans racine explicite, Turbopack remonte au parent
  // et ramasse src/instrumentation.ts de l'ERP (qui importe Prisma), ce qui
  // casse le build du site. Le site a ses propres dépendances.
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
