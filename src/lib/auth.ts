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
      // input: false partout : sans ça, POST /api/auth/update-user laisse
      // n'importe quel compte (agent compris) changer son nom ou son
      // téléphone. Ces champs ne s'écrivent que par nos actions (/team).
      firstName: {
        type: "string",
        required: true,
        input: false,
      },
      lastName: {
        type: "string",
        required: true,
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: false,
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
  // Un compte désactivé ne peut plus ouvrir de session, par aucun chemin
  // (formulaire de connexion ou route /api/auth/sign-in/email). Les
  // sessions déjà ouvertes sont supprimées par setAgentActive.
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const owner = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          });
          if (!owner?.isActive) return false;
        },
      },
    },
  },
  // Doit rester le dernier plugin : permet d'appeler auth.api.* depuis une
  // Server Action (login, logout) sans passer par /api/auth côté client.
  plugins: [nextCookies()],
});
