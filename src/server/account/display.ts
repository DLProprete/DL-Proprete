import { prisma } from "@/lib/prisma";
import { displayPrefsSchema } from "@/lib/display-prefs";
import type { SessionUser } from "@/server/auth/session";

// Tout rôle peut régler SON affichage ; l'identifiant vient de la session,
// jamais du formulaire.
export async function updateDisplayPrefs(user: SessionUser, input: unknown): Promise<void> {
  const prefs = displayPrefsSchema.parse(input);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      displayTextSize: prefs.textSize,
      displayContrast: prefs.contrast,
      displayTheme: prefs.theme,
      displayReducedMotion: prefs.reducedMotion,
      displayDyslexicFont: prefs.dyslexicFont,
    },
  });
}
