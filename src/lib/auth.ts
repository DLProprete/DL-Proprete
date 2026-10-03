import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

// Pas d'inscription libre-service ni de reset de mot de passe par e-mail au
// MVP : les comptes sont créés et réinitialisés par un ADMIN
// (docs/ARCHITECTURE.md section 0). emailAndPassword reste la seule méthode
// de connexion.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "AGENT",
        input: false,
      },
      firstName: {
        type: "string",
        required: true,
      },
      lastName: {
        type: "string",
        required: true,
      },
      phone: {
        type: "string",
        required: false,
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
      // Réglages d'affichage : lus avec la session (aucune requête en plus),
      // modifiés seulement par l'action de la page /display.
      displayTextSize: { type: "string", required: false, defaultValue: "NORMAL", input: false },
      displayContrast: { type: "boolean", required: false, defaultValue: false, input: false },
      displayTheme: { type: "string", required: false, defaultValue: "SYSTEM", input: false },
      displayReducedMotion: { type: "boolean", required: false, defaultValue: false, input: false },
      displayDyslexicFont: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  // Doit rester le dernier plugin : permet d'appeler auth.api.* depuis une
  // Server Action (login, logout) sans passer par /api/auth côté client.
  plugins: [nextCookies()],
});
