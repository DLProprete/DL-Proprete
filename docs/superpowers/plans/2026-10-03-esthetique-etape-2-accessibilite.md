# Esthétique — étape 2 : réglages d'accessibilité « Mon affichage »

> **Pour les agents d'exécution :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, tâche par tâche. Étapes à cocher (`- [ ]`).

**Objectif :** chaque utilisateur règle lui-même son affichage — taille du texte, contraste renforcé, mouvements réduits, police dyslexie —, enregistré avec son compte et appliqué sans clignotement.

**Architecture :**
- Cinq champs sur `User` (dont le thème, utilisé seulement à l'étape 3), exposés dans la session Better Auth comme `additionalFields` : pas de requête supplémentaire.
- Une lecture de session mémoïsée partagée entre `requireSession` et un nouveau `getDisplayPrefs` (renvoie `null` sans session).
- Le layout racine traduit les réglages en attributs `data-*` sur `<html>` (fonction pure testée), et `globals.css` réagit à ces attributs.
- Page `/display` commune à tous les rôles.

**Technologies :** Next.js 16 (App Router — lire `node_modules/next/dist/docs/` avant le code Next), Tailwind CSS v4 (couleurs exposées en variables `--color-*`), Prisma 6, Better Auth, Zod 4, Vitest, `next/font/local`.

**Spécification :** `docs/superpowers/specs/2026-10-03-esthetique-accessibilite-design.md` (partie 2 ; le thème sombre est l'étape 3).

## Contraintes globales

- Champs `User` et valeurs par défaut :
  - `displayTextSize` `NORMAL | LARGE | XLARGE` (défaut `NORMAL`) ;
  - `displayContrast` booléen (défaut `false`) ;
  - `displayTheme` `SYSTEM | LIGHT | DARK` (défaut `SYSTEM`) ;
  - `displayReducedMotion` booléen (défaut `false`) ;
  - `displayDyslexicFont` booléen (défaut `false`).
- Attributs posés sur `<html>` :
  - `data-text="normal|large|xlarge"` ;
  - `data-contrast="high"` (absent sinon) ;
  - `data-motion="reduce"` (absent sinon) ;
  - `data-font="dyslexic"` (absent sinon) ;
  - `data-theme`, posé mais sans effet visuel avant l'étape 3.
- Taille de police racine : 100 % / 112,5 % / 125 %.
- Contraste renforcé : texte courant ≥ 7:1 (AAA), contrôlé par calcul.
- Chacun ne modifie **que ses propres** réglages : l'identifiant vient de la session, jamais du formulaire. Validation Zod à la frontière.
- OpenDyslexic (licence SIL OFL 1.1) servie par l'app, **sans préchargement** : seuls ceux qui l'activent la téléchargent.
- Interface et commentaires en français.
- **Aucun commit sans demande explicite de l'utilisateur.**
- Base locale uniquement. Production : script SQL Supabase à lancer **avant** le push (voir la mémoire du projet).

---

### Tâche 1 : modèle, migration et session

**Fichiers :**
- Modifier : `prisma/schema.prisma` (deux enums, cinq champs sur `User`)
- Créer : `prisma/migrations/<horodatage>_display_prefs/migration.sql` (via `prisma migrate dev`)
- Modifier : `src/lib/auth.ts` (`additionalFields`)
- Modifier : `src/server/auth/session.ts` (lecture de session partagée)

**Interfaces :**
- Produit :
  - enums Prisma `DisplayTextSize` et `DisplayTheme` ;
  - champs `User.display*` ;
  - `getSessionRaw` (interne, mémoïsé), pour que `requireSession` et `getDisplayPrefs` (tâche 3) ne lisent la session qu'une fois par requête.

- [ ] **Étape 1 : schéma**

Dans `prisma/schema.prisma`, près des autres enums :

```prisma
enum DisplayTextSize {
  NORMAL
  LARGE
  XLARGE
}

enum DisplayTheme {
  SYSTEM
  LIGHT
  DARK
}
```

Dans `model User`, après `isActive` :

```prisma
  // Réglages « Mon affichage », propres à chaque utilisateur (page /display).
  displayTextSize      DisplayTextSize @default(NORMAL)
  displayContrast      Boolean         @default(false)
  displayTheme         DisplayTheme    @default(SYSTEM)
  displayReducedMotion Boolean         @default(false)
  displayDyslexicFont  Boolean         @default(false)
```

- [ ] **Étape 2 : migration locale**

Lancer `npx prisma migrate dev --name display_prefs`.
Attendu : la migration est créée et appliquée ; elle ne contient que `CREATE TYPE` ×2 et `ALTER TABLE "User" ADD COLUMN` ×5, avec leurs `DEFAULT`.

- [ ] **Étape 3 : champs dans la session Better Auth**

Dans `src/lib/auth.ts`, ajouter dans `user.additionalFields` (après `isActive`) :

```ts
      // Réglages d'affichage : lus avec la session (aucune requête en plus),
      // modifiés seulement par l'action de la page /display.
      displayTextSize: { type: "string", required: false, defaultValue: "NORMAL", input: false },
      displayContrast: { type: "boolean", required: false, defaultValue: false, input: false },
      displayTheme: { type: "string", required: false, defaultValue: "SYSTEM", input: false },
      displayReducedMotion: { type: "boolean", required: false, defaultValue: false, input: false },
      displayDyslexicFont: { type: "boolean", required: false, defaultValue: false, input: false },
```

- [ ] **Étape 4 : lecture de session partagée**

Dans `src/server/auth/session.ts`, avant `requireSession`, ajouter :

```ts
// Une seule lecture de session par requête, partagée par requireSession et
// getDisplayPrefs (layout racine).
export const getSessionRaw = cache(async () => auth.api.getSession({ headers: await headers() }));
```

Dans `requireSession`, remplacer `const session = await auth.api.getSession({ headers: await headers() });` par `const session = await getSessionRaw();`.

- [ ] **Étape 5 : vérifier**

Lancer `npx tsc --noEmit && npm run lint && npx vitest run src/server/auth`.
Attendu : aucune erreur, tests réussis.

- [ ] **Point de contrôle :** pas de commit.

---

### Tâche 2 : règles des réglages (TDD)

**Fichiers :**
- Créer : `src/lib/display-prefs.ts` (type, schéma Zod, traduction en attributs)
- Créer : `src/lib/display-prefs.test.ts`
- Créer : `src/server/account/display.ts` (`updateDisplayPrefs`)
- Créer : `src/server/account/display.test.ts` (intégration, base locale)

**Interfaces :**
- Produit :
  - `type DisplayPrefs = { textSize: "NORMAL" | "LARGE" | "XLARGE"; contrast: boolean; theme: "SYSTEM" | "LIGHT" | "DARK"; reducedMotion: boolean; dyslexicFont: boolean }` ;
  - `DEFAULT_DISPLAY_PREFS: DisplayPrefs` ;
  - `displayPrefsSchema` (Zod ; formulaire → `DisplayPrefs`, cases à cocher `"on"`/absentes) ;
  - `displayAttributes(prefs: DisplayPrefs | null): Record<string, string>` ;
  - `updateDisplayPrefs(user: SessionUser, input: unknown): Promise<void>`.

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/lib/display-prefs.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_DISPLAY_PREFS, displayAttributes, displayPrefsSchema } from "./display-prefs";

describe("displayAttributes", () => {
  it("sans session ni réglage : texte normal seulement", () => {
    expect(displayAttributes(null)).toEqual({ "data-text": "normal", "data-theme": "system" });
    expect(displayAttributes(DEFAULT_DISPLAY_PREFS)).toEqual({ "data-text": "normal", "data-theme": "system" });
  });

  it("chaque réglage actif pose son attribut", () => {
    expect(
      displayAttributes({ textSize: "XLARGE", contrast: true, theme: "DARK", reducedMotion: true, dyslexicFont: true }),
    ).toEqual({
      "data-text": "xlarge",
      "data-theme": "dark",
      "data-contrast": "high",
      "data-motion": "reduce",
      "data-font": "dyslexic",
    });
  });
});

describe("displayPrefsSchema", () => {
  it("lit un formulaire : cases cochées « on », absentes = non", () => {
    expect(displayPrefsSchema.parse({ textSize: "LARGE", theme: "SYSTEM", contrast: "on" })).toEqual({
      textSize: "LARGE",
      contrast: true,
      theme: "SYSTEM",
      reducedMotion: false,
      dyslexicFont: false,
    });
  });

  it("refuse une valeur hors liste", () => {
    expect(displayPrefsSchema.safeParse({ textSize: "HUGE", theme: "SYSTEM" }).success).toBe(false);
    expect(displayPrefsSchema.safeParse({ textSize: "NORMAL", theme: "NEON" }).success).toBe(false);
  });
});
```

`src/server/account/display.test.ts`. Pour la création des fixtures, suivre le modèle de `src/server/account/actions.test.ts`, avec la même forme de `prisma.user.create` :

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { updateDisplayPrefs } from "./display";

const suffix = Date.now();
let me: SessionUser;
let other: SessionUser;

describe("updateDisplayPrefs (intégration)", () => {
  beforeAll(async () => {
    const make = (label: string) =>
      prisma.user.create({
        data: { email: `test-display-${label}-${suffix}@dlproprete.fr`, name: label, firstName: label, lastName: "Test", role: "AGENT", emailVerified: true },
      });
    const [a, b] = [await make("moi"), await make("autre")];
    me = { id: a.id, email: a.email, role: "AGENT", isActive: true };
    other = { id: b.id, email: b.email, role: "AGENT", isActive: true };
  });
  afterAll(async () => {
    // Filtre toujours défini (suffixe constant), même si beforeAll a échoué :
    // jamais de deleteMany qui viserait toute la table.
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${suffix}@dlproprete.fr` } } });
  });

  it("enregistre mes réglages, jamais ceux d'un autre (l'id vient de la session)", async () => {
    await updateDisplayPrefs(me, { textSize: "LARGE", theme: "DARK", contrast: "on", id: other.id, userId: other.id });
    const mine = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    const theirs = await prisma.user.findUniqueOrThrow({ where: { id: other.id } });
    expect([mine.displayTextSize, mine.displayTheme, mine.displayContrast]).toEqual(["LARGE", "DARK", true]);
    expect([theirs.displayTextSize, theirs.displayContrast]).toEqual(["NORMAL", false]);
  });

  it("refuse une saisie invalide sans rien écrire", async () => {
    await expect(updateDisplayPrefs(me, { textSize: "HUGE", theme: "SYSTEM" })).rejects.toThrow();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: me.id } })).displayTextSize).toBe("LARGE");
  });
});
```

- [ ] **Étape 2 : les voir échouer**

Lancer `npx vitest run src/lib/display-prefs.test.ts src/server/account/display.test.ts`.
Attendu : échec, les modules n'existent pas.

- [ ] **Étape 3 : implémentation**

`src/lib/display-prefs.ts` :

```ts
import { z } from "zod";

// Réglages « Mon affichage » (page /display), propres à chaque utilisateur.
export type DisplayPrefs = {
  textSize: "NORMAL" | "LARGE" | "XLARGE";
  contrast: boolean;
  theme: "SYSTEM" | "LIGHT" | "DARK";
  reducedMotion: boolean;
  dyslexicFont: boolean;
};

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  textSize: "NORMAL",
  contrast: false,
  theme: "SYSTEM",
  reducedMotion: false,
  dyslexicFont: false,
};

// Case à cocher HTML : "on" si cochée, absente sinon.
const checkbox = z.preprocess((value) => value === "on" || value === true, z.boolean());

export const displayPrefsSchema = z.object({
  textSize: z.enum(["NORMAL", "LARGE", "XLARGE"]),
  contrast: checkbox,
  theme: z.enum(["SYSTEM", "LIGHT", "DARK"]),
  reducedMotion: checkbox,
  dyslexicFont: checkbox,
});

// Attributs posés sur <html> par le layout racine ; globals.css y réagit.
export function displayAttributes(prefs: DisplayPrefs | null): Record<string, string> {
  const p = prefs ?? DEFAULT_DISPLAY_PREFS;
  return {
    "data-text": p.textSize.toLowerCase(),
    "data-theme": p.theme.toLowerCase(),
    ...(p.contrast ? { "data-contrast": "high" } : {}),
    ...(p.reducedMotion ? { "data-motion": "reduce" } : {}),
    ...(p.dyslexicFont ? { "data-font": "dyslexic" } : {}),
  };
}
```

`src/server/account/display.ts` :

```ts
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
```

- [ ] **Étape 4 : les voir passer**

Lancer la même commande.
Attendu : tous les tests réussissent.

- [ ] **Point de contrôle :** pas de commit.

---

### Tâche 3 : application sur `<html>` et feuille de style

**Fichiers :**
- Modifier : `src/server/auth/session.ts` (`getDisplayPrefs`)
- Modifier : `src/app/layout.tsx` (attributs ; commentaire Inter inexact)
- Modifier : `src/app/globals.css` (taille, contraste, mouvements)

**Interfaces :**
- Consomme : `getSessionRaw` (tâche 1), `DisplayPrefs` et `displayAttributes` (tâche 2).
- Produit : `getDisplayPrefs(): Promise<DisplayPrefs | null>`.

- [ ] **Étape 1 : lecteur de réglages**

Dans `src/server/auth/session.ts` :

```ts
import type { DisplayPrefs } from "@/lib/display-prefs";

// Réglages d'affichage de la session courante, ou null (page de connexion,
// portail client sans compte). Jamais d'exception : le rendu ne doit pas
// dépendre d'eux.
export const getDisplayPrefs = cache(async (): Promise<DisplayPrefs | null> => {
  const user = (await getSessionRaw().catch(() => null))?.user as Record<string, unknown> | undefined;
  if (!user) return null;
  return {
    textSize: (user.displayTextSize as DisplayPrefs["textSize"]) ?? "NORMAL",
    contrast: user.displayContrast === true,
    theme: (user.displayTheme as DisplayPrefs["theme"]) ?? "SYSTEM",
    reducedMotion: user.displayReducedMotion === true,
    dyslexicFont: user.displayDyslexicFont === true,
  };
});
```

- [ ] **Étape 2 : layout racine**

Dans `src/app/layout.tsx` :
- rendre `RootLayout` asynchrone ;
- importer `getDisplayPrefs` et `displayAttributes` ;
- poser `{...displayAttributes(await getDisplayPrefs())}` sur `<html>`.

Corriger le commentaire d'Inter, qui dit « mise en cache : disponible hors connexion », en : « gardée par le cache du navigateur après la première visite (le service worker ne traite pas /_next/*) ».

Pour vérifier que l'appel à la session dans le layout racine est permis, lire `node_modules/next/dist/docs/` sur les layouts et le rendu dynamique. Il rend toutes les pages dynamiques ; c'est déjà le cas des pages métier (`requireSession`).

- [ ] **Étape 3 : feuille de style**

Dans `src/app/globals.css`, à la fin de `@layer base` :

```css
  /* ---- Réglages « Mon affichage » (attributs posés par src/app/layout.tsx) ---- */

  /* Taille du texte : tout l'outil est en rem, y compris les cibles tactiles. */
  html[data-text="large"] {
    font-size: 112.5%;
  }
  html[data-text="xlarge"] {
    font-size: 125%;
  }

  /* Contraste renforcé : gris foncés (≥ 7:1 sur blanc et sur #F4F6F7),
     bordures nettes, textes de la barre marine en blanc plein. */
  html[data-contrast="high"] {
    --color-zinc-100: var(--color-zinc-300);
    --color-zinc-200: var(--color-zinc-500);
    --color-zinc-400: var(--color-zinc-700);
    --color-zinc-500: var(--color-zinc-800);
    --color-zinc-600: var(--color-zinc-800);
    --color-zinc-700: var(--color-zinc-900);
  }
  html[data-contrast="high"] aside :is(.text-white\/60, .text-white\/80),
  html[data-contrast="high"] header :is(.text-white\/60, .text-white\/80) {
    color: #fff;
  }

  /* Mouvements réduits : réglage du compte ou réglage du système. */
  html[data-motion="reduce"] *,
  html[data-motion="reduce"] *::before,
  html[data-motion="reduce"] *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
```

Vérifier dans le CSS compilé (`npm run build`, puis rechercher `--color-zinc-500` dans `.next/static/**/*.css`) que les utilitaires `text-zinc-*` lisent bien `var(--color-zinc-*)`, sans quoi la redéfinition n'aurait aucun effet. Si ce n'est pas le cas, s'arrêter et le signaler (BLOCKED).

- [ ] **Étape 4 : contrastes calculés**

Calculer, avec le script de contraste de l'étape 1 adapté (valeurs hex lues dans `node_modules/tailwindcss/theme.css` pour zinc-800 et zinc-900), le ratio de zinc-800 et zinc-900 sur `#ffffff` et sur `#f4f6f7`.
Attendu : ≥ 7 dans tous les cas.

- [ ] **Étape 5 : vérifier**

Lancer `npx tsc --noEmit && npm run lint && npm test`.
Attendu : tout passe.

- [ ] **Point de contrôle :** pas de commit.

---

### Tâche 4 : police dyslexie, sans préchargement

**Fichiers :**
- Créer : `src/fonts/opendyslexic/` (woff2 latin 400 et 700, et `OFL.txt`)
- Modifier : `src/app/layout.tsx` (`next/font/local`, `preload: false`)
- Modifier : `src/app/globals.css` (règle `data-font`)

- [ ] **Étape 1 : récupérer les fichiers officiels**

Les fichiers viennent du paquet npm `@fontsource/opendyslexic` (OFL-1.1), sans l'ajouter aux dépendances :

```bash
cd "$(mktemp -d)" && npm pack @fontsource/opendyslexic@5.3.0 >/dev/null && tar -xzf fontsource-opendyslexic-5.3.0.tgz && ls package/files | grep -E "latin-(400|700)-normal\.woff2$"; ls package | grep -i -E "licen|ofl"
```

Copier `opendyslexic-latin-400-normal.woff2` et `opendyslexic-latin-700-normal.woff2` dans `src/fonts/opendyslexic/`, ainsi que le fichier de licence du paquet, sous le nom `OFL.txt`.

- [ ] **Étape 2 : déclaration sans préchargement**

Dans `src/app/layout.tsx` :

```tsx
import localFont from "next/font/local";

// Police de lecture facilitée (réglage « Police dyslexie », page /display).
// preload: false — téléchargée seulement par ceux qui l'activent.
const dyslexic = localFont({
  src: [
    { path: "../fonts/opendyslexic/opendyslexic-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/opendyslexic/opendyslexic-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-dyslexic",
  preload: false,
  display: "swap",
});
```

Ajouter `${dyslexic.variable}` à la `className` de `<html>`. Lire d'abord la doc `next/font` locale dans `node_modules/next/dist/docs/` pour confirmer les options.

- [ ] **Étape 3 : règle CSS**

Dans `src/app/globals.css`, dans la section « Mon affichage » :

```css
  /* Police dyslexie : remplace Inter partout, la pile système reste en repli. */
  html[data-font="dyslexic"] body {
    font-family: var(--font-dyslexic), var(--font-sans);
  }
```

- [ ] **Étape 4 : vérifier**

Lancer `npx tsc --noEmit && npm run lint && npm run build`.
Attendu : le build réussit. Rechercher dans le HTML d'une page qu'aucun `<link rel="preload" … opendyslexic` n'est émis.

- [ ] **Point de contrôle :** pas de commit.

---

### Tâche 5 : page « Mon affichage » et liens d'accès

**Fichiers :**
- Créer : `src/app/display/page.tsx`
- Créer : `src/app/display/actions.ts`
- Modifier : `src/components/sidebar.tsx` (lien au-dessus de « Déconnexion »)
- Modifier : `src/app/(agent)/layout.tsx` (lien à côté de « Déconnexion »)

**Interfaces :**
- Consomme : `requireSession`, `getDisplayPrefs`, `updateDisplayPrefs`, `DEFAULT_DISPLAY_PREFS`, `Logo`.

- [ ] **Étape 1 : action serveur**

`src/app/display/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { updateDisplayPrefs } from "@/server/account/display";

export async function updateDisplayPrefsAction(formData: FormData) {
  const user = await requireSession();
  await updateDisplayPrefs(user, Object.fromEntries(formData));
  // Le layout racine porte les attributs : tout l'arbre est à recalculer.
  revalidatePath("/", "layout");
  redirect("/display?saved=1");
}
```

- [ ] **Étape 2 : page**

`src/app/display/page.tsx` est une page serveur, commune à tous les rôles et accessible seulement connecté :
- **en-tête** : marine, avec `<Logo tone="blanc" className="h-5" />` et un lien « ← Retour » vers `/` (qui redirige selon le rôle). Le lien porte `focus-visible:outline-white`, puisqu'il est posé sur le marine ;
- **titre** : `<h1>Mon affichage</h1>`, dans un `<main className="app-main …">` (titre marine) ;
- **message de confirmation** : « Réglages enregistrés. » si `?saved=1` ;
- **formulaire** (`action={updateDisplayPrefsAction}`), en cartes `.card` :
  - **Taille du texte** : trois boutons radio `textSize` (Normal, Grand, Très grand). Chaque libellé est écrit à sa taille (`text-base`, `text-lg`, `text-xl`), pour servir d'aperçu ;
  - **Contraste renforcé** : case `contrast`, avec la description « Textes plus foncés et bordures marquées, pour la lecture en plein soleil. » ;
  - **Mouvements réduits** : case `reducedMotion`, avec la description « Supprime les animations. Le réglage du téléphone est aussi respecté. » ;
  - **Police dyslexie** : case `dyslexicFont`, avec la description « Police OpenDyslexic, plus lisible pour certaines personnes dyslexiques. » ;
  - **Thème** : champ caché `theme`, qui reprend la valeur actuelle. Le choix du thème sera visible à l'étape 3 ;
  - bouton `btn btn-primary btn-field` : « Enregistrer ».
- Valeurs initiales : `(await getDisplayPrefs()) ?? DEFAULT_DISPLAY_PREFS`.
- Sans session : `redirect("/login")`.
- Toutes les cases et tous les boutons radio ont un `<label htmlFor>` et des cibles d'au moins `--tap-min`.

- [ ] **Étape 3 : liens**

- `sidebar.tsx` : juste avant le `<form>` de déconnexion, ajouter un lien `<Link href="/display">Mon affichage</Link>`. Il prend les mêmes classes que le bouton de déconnexion (`… text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-white`) et un `onClick={() => setOpen(false)}`.
- `(agent)/layout.tsx` : à côté du bouton « Déconnexion » du bas de page, ajouter `<Link href="/display" className="text-sm text-zinc-600 underline">Mon affichage</Link>`, séparé par un espace.

- [ ] **Étape 4 : vérifier**

Lancer `npx tsc --noEmit && npm run lint`.
Attendu : aucune erreur.

- [ ] **Point de contrôle :** pas de commit.

---

### Tâche 6 : vérification d'ensemble et migration de production

- [ ] **Étape 1 :** lancer `npx tsc --noEmit && npm run lint && npm test && npm run build`. Attendu : tout passe.
- [ ] **Étape 2 :** dans le navigateur, en local, avec les comptes de démo (localhost seulement), sur bureau et sur mobile, pour un admin et pour un agent, vérifier chaque réglage :
  - taille Grand et Très grand : rien de coupé, menu et cartes lisibles ;
  - contraste : gris foncés, barre latérale en blanc plein ;
  - mouvements réduits : plus de transition sur le menu mobile ;
  - police dyslexie : la police change, et un compte sans ce réglage ne la télécharge pas (onglet réseau) ;
  - pas de clignotement au chargement ;
  - un agent ne voit que ses propres réglages ;
  - remettre tous les réglages par défaut à la fin.
- [ ] **Étape 3 :** relecture de l'ensemble par l'agent `relecteur`.
- [ ] **Étape 4 :** préparer le script SQL de production, idempotent :
  - `CREATE TYPE` avec garde `DO $$ … EXCEPTION WHEN duplicate_object …` ;
  - `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS` ;
  - insertion dans `_prisma_migrations`, avec comme somme de contrôle le SHA-256 du `migration.sql`.

  Le donner à l'utilisateur. **Ne pas pousser avant sa confirmation.**
- [ ] **Étape 5 :** validation par l'utilisateur, puis commit et push uniquement s'il le demande explicitement.
