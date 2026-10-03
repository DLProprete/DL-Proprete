# Esthétique — étape 1 : visuel « barre latérale marine »

> **Pour les agents d'exécution :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, tâche par tâche. Étapes à cocher (`- [ ]`).

**Objectif :** donner une identité DL Propreté au back-office et à l'app agent, dans les limites de la charte v1.0.

**Architecture :** changements d'habillage uniquement.
- Tokens et classes dans `src/app/globals.css`.
- Police Inter via `next/font` dans le layout racine.
- Barre latérale marine et logo blanc.
- Composants réutilisables pour les pictogrammes métier et les écrans vides.
- Accueil du tableau de bord et en-tête marine de l'app agent.

Aucune migration, aucune modification de structure ni de logique métier.

**Technologies :** Next.js 16 (App Router — lire `node_modules/next/dist/docs/` avant d'écrire du code), Tailwind CSS v4 (`@theme`), `next/font/google`, Vitest.

**Spécification :** `docs/superpowers/specs/2026-10-03-esthetique-accessibilite-design.md` (partie 1).

## Contraintes globales

- Couleurs de la charte uniquement :
  - marine `#243746` (`brand-700`) ;
  - noir `#1A1A1A` ;
  - gris `#5E6E78` ;
  - fond `#F4F6F7` (`brand-50`).
- Ni dégradé, ni ombre marquée, ni nouvelle teinte.
- Couleurs d'état inchangées : ambre = à traiter, rouge = erreur ou retard, vert = validé.
- Contraste AA minimum (4,5:1 texte courant, 3:1 grands textes et icônes), **calculé** et non estimé.
- Cibles tactiles, focus visible et structure des pages inchangés.
- Logo : fichiers officiels seulement. Le blanc est copié de `docs/brand/dl-proprete-logo-blanc.svg`, avec un `viewBox` recadré comme pour `public/brand/dl-proprete-logo-web.svg` (recadrage autorisé par la charte p. 5).
- Le monogramme n'est jamais collé au nom.
- Interface en français.
- **Aucun commit sans demande explicite de l'utilisateur** : les points de contrôle remplacent les commits.
- Base de données locale uniquement (les tests et le seed refusent toute autre base).

---

### Tâche 1 : police Inter et fond de la charte

**Fichiers :**
- Modifier : `src/app/layout.tsx`
- Modifier : `src/app/globals.css` (`--font-sans`, `--background`, couleur des titres)

**Interfaces :**
- Produit : la variable CSS `--font-inter` sur `<html>` ; `--font-sans` commence par `var(--font-inter)`.

- [ ] **Étape 1 : vérifier l'API `next/font` de cette version**

Lancer `ls node_modules/next/dist/docs/01-app/03-api-reference/02-components/ | grep -i font`, puis lire le fichier `font.md` trouvé.
Attendu : `next/font/google` exporte `Inter({ subsets, variable, display })`, qui renvoie `{ variable, className }`.

- [ ] **Étape 2 : brancher Inter dans le layout racine**

Dans `src/app/layout.tsx`, ajouter :

```tsx
import { Inter } from "next/font/google";

// Police de la charte, auto-hébergée par next/font (fichiers embarqués au
// build, aucun appel à Google) et mise en cache : disponible hors connexion.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
```

Remplacer `<html lang="fr" className="antialiased">` par :

```tsx
<html lang="fr" className={`${inter.variable} antialiased`}>
```

Remplacer `themeColor: "#0f766e",` par `themeColor: "#243746",`. C'est l'ancien teal, et `manifest.ts` est déjà en marine.

- [ ] **Étape 3 : pile de polices et fond**

Dans `src/app/globals.css` :
- remplacer la déclaration `--font-sans` et son commentaire par :

```css
  /* Inter, police de la charte (next/font, src/app/layout.tsx), puis pile
     système en repli tant qu'elle n'est pas chargée. */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif;
```

- dans `:root`, remplacer `--background: #fafafa;` par :

```css
  --background: #f4f6f7; /* « Fond » de la charte */
```

- dans `@layer base`, après la règle `body`, ajouter :

```css
  /* Titres de page en marine : l'identité passe par les titres, pas par
     des aplats décoratifs. */
  main h1 {
    color: var(--color-brand-700);
  }
```

- [ ] **Étape 4 : vérifier**

Lancer `npx tsc --noEmit && npm run lint`.
Attendu : aucune erreur.

- [ ] **Point de contrôle :** pas de commit (règle utilisateur).

---

### Tâche 2 : logo blanc et barre latérale marine

**Fichiers :**
- Créer : `public/brand/dl-proprete-logo-blanc-web.svg`
- Modifier : `src/components/logo.tsx`
- Modifier : `src/components/sidebar.tsx`
- Modifier : `src/app/(back-office)/layout.tsx` (fond `bg-zinc-50` → `bg-brand-50`)

**Interfaces :**
- Produit : `Logo({ className, tone }: { className?: string; tone?: "marine" | "blanc" })`. Valeur par défaut `"marine"`, ce qui ne casse aucun appel existant.

- [ ] **Étape 1 : créer la version web du logo blanc**

Lancer :

```bash
sed -e 's/width="903.1" height="291.8" viewBox="0 0 903.1 291.8"/width="728.56" height="117.26" viewBox="87.27 87.27 728.56 117.26"/' docs/brand/dl-proprete-logo-blanc.svg > public/brand/dl-proprete-logo-blanc-web.svg
grep -c 'viewBox="87.27 87.27 728.56 117.26"' public/brand/dl-proprete-logo-blanc-web.svg
```

Attendu : `1`. Seul le cadrage change, les tracés sont identiques à l'original.

- [ ] **Étape 2 : ajouter la variante blanche à `Logo`**

Dans `src/components/logo.tsx`, remplacer la fonction `Logo` par :

```tsx
// « blanc » : sur aplat marine uniquement (barre latérale, en-tête agent).
export function Logo({ className, tone = "marine" }: { className?: string; tone?: "marine" | "blanc" }) {
  return (
    <img
      src={tone === "blanc" ? "/brand/dl-proprete-logo-blanc-web.svg" : "/brand/dl-proprete-logo-web.svg"}
      alt="DL Propreté"
      width={729}
      height={117}
      className={`h-6 w-auto ${className ?? ""}`}
    />
  );
}
```

Mettre à jour le commentaire de tête du fichier : la phrase « la contrainte réseau terrain (police système) est respectée » devient « aucun fichier de police n'est nécessaire au logo ».

- [ ] **Étape 3 : passer la barre latérale en marine**

Dans `src/components/sidebar.tsx` :
- bandeau mobile `div` (`lg:hidden`) : `border-zinc-200 bg-white` → `bg-brand-700` ; `<Logo />` → `<Logo tone="blanc" />` ; classe du bouton menu `text-zinc-600 hover:bg-zinc-100` → `text-white hover:bg-white/10` ;
- `aside` : `border-r border-zinc-200 bg-white` → `bg-brand-700` ;
- logo du bureau : `<Logo />` → `<Logo tone="blanc" />` ;
- titres de groupe : `text-zinc-500` → `text-white/60` ;
- lien actif : `"bg-brand-50 text-brand-700"` → `"bg-white/15 text-white"` ;
- lien inactif : `"text-zinc-700 hover:bg-zinc-100"` → `"text-white/80 hover:bg-white/10 hover:text-white"` ;
- formulaire de déconnexion : `border-t border-zinc-200` → `border-t border-white/15` ; bouton `text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900` → `text-white/80 hover:bg-white/10 hover:text-white`.

Ajouter au-dessus du composant :

```tsx
// Aplat marine de la charte : l'identité DL Propreté au premier coup d'œil.
// Contrastes calculés sur #243746 : blanc 12,3:1, blanc/80 ≈ 8,9:1,
// blanc/60 ≈ 5,6:1 (AA texte courant).
```

- [ ] **Étape 4 : fond du back-office**

Dans `src/app/(back-office)/layout.tsx`, remplacer `bg-zinc-50 lg:flex-row` par `bg-brand-50 lg:flex-row`.

- [ ] **Étape 5 : vérifier le contraste réel**

Calculer les contrastes avec un script Node, sans les estimer :

```bash
node -e '
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const lum=c=>{const [r,g,b]=c.map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return 0.2126*r+0.7152*g+0.0722*b};
const mix=(fg,bg,a)=>fg.map((v,i)=>v*a+bg[i]*(1-a));
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return ((x+0.05)/(y+0.05)).toFixed(2)};
const marine=hex("#243746"), white=[1,1,1];
for (const a of [1,0.8,0.6]) console.log("blanc", a, ratio(mix(white,marine,a),marine));
console.log("marine sur fond", ratio(marine,hex("#f4f6f7")));'
```

Attendu : `blanc 1` ≥ 12, `blanc 0.8` ≥ 7, `blanc 0.6` ≥ 4.5, marine sur fond ≥ 10. Si `0.6` passe sous 4,5, remplacer `text-white/60` par `text-white/70`.

- [ ] **Point de contrôle :** pas de commit.

---

### Tâche 3 : pictogrammes métier et écrans vides

**Fichiers :**
- Créer : `src/components/brand-icons.tsx`
- Créer : `src/components/empty-state.tsx`
- Modifier : `src/app/(back-office)/dashboard/page.tsx` (composant `Section`, « Rien à signaler. »)
- Modifier : `src/app/(back-office)/documents/page.tsx` (« Aucun document déposé. »)

**Interfaces :**
- Produit :
  - `BatimentIcon`, `IndustrielIcon`, `ProduitsIcon`, `InterventionIcon` : `({ className?: string }) => JSX` ;
  - `EmptyState({ icon, children }: { icon: "batiment" | "industriel" | "produits" | "intervention"; children: React.ReactNode })`.

- [ ] **Étape 1 : copier les pictogrammes officiels**

Créer `src/components/brand-icons.tsx` en reprenant **à l'identique** les tracés de `site/src/components/icons.tsx` (`BatimentIcon`, `IndustrielIcon`, `ProduitsIcon`, `InterventionIcon`). Ce sont les tracés de `docs/brand/icone-*.svg`.

```tsx
// Les quatre pictogrammes métier de la charte v1.0 (docs/brand/icone-*.svg),
// mêmes tracés que le site (site/src/components/icons.tsx). Marine seul,
// via currentColor ; jamais dans le logo ni à côté du nom.
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BatimentIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M9 20v-6h6v6" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function IndustrielIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M3 20V11.2L7.2 13.4V11.2L11.4 13.4V9.2H17.5V20H3" />
    </svg>
  );
}

export function ProduitsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M8 7h8v13H8z" />
      <path d="M10 7V4h4v3" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function InterventionIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="1.5" />
      <path d="M8 3v4M16 3v4M4 9h16" />
      <path d="M8 14l2.2 2.2L16 11" />
    </svg>
  );
}
```

Avant de valider, vérifier que les tracés `d=` sont identiques à ceux de `docs/brand/icone-*.svg`.

- [ ] **Étape 2 : composant d'écran vide**

Créer `src/components/empty-state.tsx` :

```tsx
import { BatimentIcon, IndustrielIcon, InterventionIcon, ProduitsIcon } from "./brand-icons";

const ICONS = {
  batiment: BatimentIcon,
  industriel: IndustrielIcon,
  produits: ProduitsIcon,
  intervention: InterventionIcon,
};

// Écran vide : un pictogramme métier marine plutôt qu'une ligne grise.
export function EmptyState({ icon, children }: { icon: keyof typeof ICONS; children: React.ReactNode }) {
  const Icon = ICONS[icon];
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-sm text-zinc-600">
      <Icon className="h-8 w-8 text-brand-700" />
      <p>{children}</p>
    </div>
  );
}
```

- [ ] **Étape 3 : l'utiliser**

- `dashboard/page.tsx`, composant `Section` : ajouter la prop `icon: "batiment" | "industriel" | "produits" | "intervention"` et remplacer `<p className="px-4 py-3 text-sm text-zinc-500">Rien à signaler.</p>` par `<EmptyState icon={icon}>Rien à signaler.</EmptyState>`.
- Aux trois appels de `Section` : `icon="intervention"` pour les vacations non pourvues, `icon="produits"` pour les factures impayées, `icon="batiment"` pour les contrats qui expirent.
- `documents/page.tsx` : remplacer le `<li className="py-3 text-zinc-500">…</li>` des documents vides par `<li><EmptyState icon="produits">{isFiltered ? "Aucun document ne correspond." : "Aucun document déposé."}</EmptyState></li>`.

- [ ] **Étape 4 : vérifier**

Lancer `npx tsc --noEmit && npm run lint`.
Attendu : aucune erreur.

- [ ] **Point de contrôle :** pas de commit.

---

### Tâche 4 : pastilles monochromes et accueil du tableau de bord

**Fichiers :**
- Modifier : `src/app/globals.css` (bloc stat-cards, et `--color-cat-*` à supprimer)
- Modifier : `src/app/(back-office)/dashboard/page.tsx`
- Modifier : `src/app/(back-office)/contracts/[contractId]/page.tsx` (2 pastilles)
- Modifier : `src/lib/dates.ts` + `src/lib/dates.test.ts` (nouvelle fonction)
- Modifier : `docs/DESIGN.md` (retirer l'exception des couleurs de catégorie)

**Interfaces :**
- Produit : `formatLongDateParis(date: Date): string`, qui renvoie par exemple `"samedi 3 octobre"` (minuscules, fuseau Europe/Paris).

- [ ] **Étape 1 : écrire le test qui échoue**

Ajouter dans `src/lib/dates.test.ts` (ou le créer s'il n'existe pas, en important `describe, expect, it` depuis `vitest`) :

```ts
import { formatLongDateParis } from "./dates";

describe("formatLongDateParis", () => {
  it("donne le jour et la date en toutes lettres, à l'heure de Paris", () => {
    expect(formatLongDateParis(new Date("2026-10-03T10:00:00Z"))).toBe("samedi 3 octobre");
    // 23 h 30 UTC le 3 = déjà le 4 à Paris
    expect(formatLongDateParis(new Date("2026-10-03T23:30:00Z"))).toBe("dimanche 4 octobre");
  });
});
```

- [ ] **Étape 2 : lancer le test pour le voir échouer**

Lancer `npx vitest run src/lib/dates.test.ts`.
Attendu : échec, `formatLongDateParis` n'est pas exportée.

- [ ] **Étape 3 : implémentation minimale**

Dans `src/lib/dates.ts` :

```ts
const longDateParis = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });

// « samedi 3 octobre » — accueil du tableau de bord et de l'app agent.
export function formatLongDateParis(date: Date): string {
  return longDateParis.format(date);
}
```

- [ ] **Étape 4 : lancer le test pour le voir passer**

Lancer `npx vitest run src/lib/dates.test.ts`.
Attendu : réussite.

- [ ] **Étape 5 : pastilles monochromes**

Dans `src/app/globals.css` :
- supprimer les dix variables `--color-cat-*` et leur commentaire ;
- supprimer les classes `.stat-badge-blue/-aqua/-magenta/-violet/-terracotta` ;
- remplacer `.stat-badge` et le commentaire du bloc par :

```css
  /* ---- Cartes de synthèse (stat-cards) --------------------------------
     Pastille d'icône monochrome marine (charte : marine seul). La couleur
     d'état reste portée par la valeur (ambre quand il y a à faire). */
  .stat-badge {
    @apply inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-100 text-brand-700;
  }
```

Dans `dashboard/page.tsx` et `contracts/[contractId]/page.tsx`, retirer toute classe `stat-badge-…` :
- dans le tableau `counters`, supprimer les clés `badge` ;
- remplacer `className={`stat-badge ${counter.badge}`}` par `className="stat-badge"` ;
- remplacer `"stat-badge stat-badge-xxx"` par `"stat-badge"`.

Vérifier avec `grep -rn "stat-badge-\|cat-" src`. Attendu : aucun résultat.

- [ ] **Étape 6 : accueil**

Dans `dashboard/page.tsx` :
- ajouter `prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { firstName: true } })` au `Promise.all` existant (nommer le résultat `me`) ;
- importer `prisma` depuis `@/lib/prisma` et `formatLongDateParis` depuis `@/lib/dates` ;
- remplacer `<h1 className="text-xl font-semibold">Tableau de bord</h1>` par :

```tsx
<div>
  <p className="text-sm text-zinc-600">Tableau de bord · {formatLongDateParis(today)}</p>
  <h1 className="text-2xl font-semibold">Bonjour {me.firstName}</h1>
</div>
```

- [ ] **Étape 7 : documentation**

Dans `docs/DESIGN.md` :
- supprimer le paragraphe « **Exception, depuis le 01/09/2026 : les pastilles d'icône des cartes de synthèse …** » ;
- remplacer `(\`brand\`, teal)` par `(\`brand\`, marine #243746)` ;
- ajouter sous « Règles » :

```markdown
**Identité (03/10/2026).** Barre latérale en aplat marine avec le logo blanc,
fond de page `#F4F6F7` (« Fond » de la charte), titres de page en marine,
pictogrammes métier pour les écrans vides (`EmptyState`), pastilles de
synthèse monochromes marine. Aucune autre teinte décorative.
```

Dans `docs/BRAND.md`, section « Écarts assumés », remplacer la puce « **Outil interne en police système** … » par :

```markdown
- **Outil interne en Inter depuis le 03/10/2026** (auparavant police
  système) : servie par l'application via next/font, sans appel externe,
  mise en cache pour l'usage hors connexion.
```

- [ ] **Étape 8 : vérifier**

Lancer `npx tsc --noEmit && npm run lint && npx vitest run src/lib`.
Attendu : aucune erreur, tests réussis.

- [ ] **Point de contrôle :** pas de commit.

---

### Tâche 5 : en-tête marine de l'app agent

**Fichiers :**
- Modifier : `src/app/(agent)/layout.tsx`

**Interfaces :**
- Consomme : `Logo({ tone: "blanc" })` (tâche 2), `formatLongDateParis` (tâche 4).

Écart assumé par rapport à la spécification : l'en-tête porte le **logo blanc** plutôt que le monogramme. Le monogramme est un carré marine, qui disparaîtrait sur un aplat marine. La salutation « Bonjour, <prénom> » reste en tête de l'écran « Aujourd'hui », où elle existe déjà.

- [ ] **Étape 1 : en-tête marine et fond de la charte**

Dans `src/app/(agent)/layout.tsx` :
- remplacer l'import `LogoBadge` par `import { Logo } from "@/components/logo";` et ajouter `import { formatLongDateParis } from "@/lib/dates";` ;
- remplacer `bg-zinc-50` (div racine) par `bg-brand-50` ;
- remplacer le bloc d'en-tête :

```tsx
<div className="flex items-center justify-center border-b border-zinc-200 bg-white py-2">
  <LogoBadge />
</div>
```

par :

```tsx
<header className="flex items-center justify-between bg-brand-700 px-6 py-3">
  <Logo tone="blanc" className="h-5" />
  <p className="text-sm text-white/80">{formatLongDateParis(new Date())}</p>
</header>
```

La barre de navigation du bas (`agent-nav.tsx`) n'est **pas** modifiée : elle reste blanche, pour le contraste en plein soleil.

- [ ] **Étape 2 : vérifier**

Lancer `npx tsc --noEmit && npm run lint`.
Attendu : aucune erreur.

- [ ] **Point de contrôle :** pas de commit.

---

### Tâche 6 : vérification d'ensemble et avant/après

**Fichiers :** aucun (contrôle).

- [ ] **Étape 1 : suite complète**

Lancer `npx tsc --noEmit && npm run lint && npm test && npm run build`.
Attendu : tout passe (au moins 328 tests : 327 + le nouveau test de date).

- [ ] **Étape 2 : captures**

Démarrer le serveur local (`PORT=3200 npm run dev`) sur la base locale, avec les comptes de démo du seed (localhost uniquement).

Faire les captures (`testeur-navigateur` ou navigateur intégré) :
- en 1280×800 : tableau de bord, planning, factures, Paramètres ;
- en 375×812 : mêmes écrans avec le menu ouvert, puis app agent « Aujourd'hui » (compte `agent1`) et page de connexion.

Comparer avec l'état d'avant (captures de `main` avant les tâches).

Contrôler : aucun texte illisible, logo net, pas de débordement à 375 px, état actif du menu visible, ambre et rouge toujours lisibles.

- [ ] **Étape 3 : relecture**

Faire relire le diff par l'agent `relecteur`, en lui donnant la charte (`docs/BRAND.md`) et les contraintes globales de ce plan. Corriger les points confirmés.

- [ ] **Étape 4 : remise à l'utilisateur**

Montrer l'avant/après et attendre sa validation. **Commit seulement sur sa demande explicite**, puis push, avec avance rapide vérifiée et tests verts.
