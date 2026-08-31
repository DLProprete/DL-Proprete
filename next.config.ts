import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Le badge Next (dev only) recouvre systématiquement quelque chose selon
  // le coin choisi : bas-gauche = Déconnexion de la sidebar admin,
  // bas-droite = Déconnexion de la barre basse agent, haut-droite = le
  // hamburger mobile admin, haut-gauche = le titre "Bonjour, {prénom}"
  // (vérifié par capture Playwright). Aucun coin n'est libre sur toutes les
  // pages — désactivé plutôt que de choisir quel élément il recouvrira.
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
