# Esthétique et accessibilité — conception

Date : 03/10/2026. Statut : validée en discussion, à relire avant le plan
de réalisation.

## Contexte

Le back-office et l'app agent sont jugés « trop fades, administratifs » :
blanc et gris dominants, logo discret, rien qui évoque DL Propreté. La
charte v1.0 (`docs/BRAND.md`) borne strictement la réponse :
- couleurs : marine `#243746`, noir `#1A1A1A`, gris `#5E6E78`, fond
  `#F4F6F7` ;
- interdits : dégradés, or, vert ménager, et les teintes du marine
  éclaircies à des fins décoratives ;
- une seule police, Inter.

L'identité doit donc venir de l'**usage** de ces éléments, pas de couleurs
ajoutées.

Deuxième besoin : chaque utilisateur doit pouvoir régler lui-même
l'affichage (taille du texte, contraste, thème, mouvements, police
dyslexie). Les réglages suivent le compte, d'un appareil à l'autre.

Périmètre : back-office et app agent. Le portail client et la page de
connexion gardent leur apparence. Ils suivent seulement le thème de
l'appareil, et la page de connexion respecte les préférences du système.

## Partie 1 — Visuel (direction A « barre latérale marine »)

**Back-office**
- Barre latérale en aplat marine `#243746`, avec le logo blanc officiel
  (`public/brand/`, copie web de `dl-proprete-logo-blanc.svg`).
  - Liens en blanc atténué, page active en blanc plein sur une
    surbrillance blanche translucide.
  - Titres de rubrique (Exploitation, Commercial…) en blanc atténué, en
    petites capitales.
- Fond de page `#F4F6F7`, contenu sur des cartes blanches. Titres en
  Inter SemiBold marine (même écart que le site, validé le 02/10).
- Tableau de bord :
  - accueil « Bonjour <prénom> » et date du jour (Europe/Paris) ;
  - cartes de synthèse avec pastilles **monochromes marine** et
    pictogrammes. Les couleurs de catégorie `--color-cat-*` sont
    supprimées, car hors charte ; l'exception notée dans
    `docs/DESIGN.md` est retirée.
- Écrans vides illustrés d'un pictogramme métier de la charte (bâtiment,
  industriel, produits, intervention), en marine, au lieu d'une ligne
  grise.

**App agent**
- En-tête marine avec le monogramme, « Bonjour <prénom> » et la date.
- Vacations du jour sur de grandes cartes blanches posées sur le fond
  `#F4F6F7`.
- La navigation du bas reste claire, pour un contraste maximal en plein
  soleil.

**Inchangé**
- Couleurs d'état : ambre = à traiter, rouge = erreur ou retard, vert =
  validé.
- Cibles tactiles (`--tap-min`, `--tap-field`), focus visible, contraste
  AA.
- Structure des pages et navigation.

**Police**
- Inter, servie par l'application via `next/font` : fichiers embarqués
  au build, aucun appel à Google, cache du service worker, donc
  disponible hors connexion.
- Remplace la pile système, ce qui revient sur l'écart validé le
  02/10/2026 ; `docs/BRAND.md` est à mettre à jour. Surcoût : environ
  100 Ko, téléchargés une fois.

## Partie 2 — Réglages d'accessibilité

**Page « Mon affichage »** (`/display`), ouverte à tous les rôles :
- accès par un lien en bas de la barre latérale, près de « Déconnexion »,
  et depuis l'app agent ;
- application immédiate, avec aperçu.

**Modèle** — cinq champs sur `User` (une migration, valeurs par défaut
neutres) :

| Champ | Valeurs | Défaut |
|---|---|---|
| `displayTextSize` | `NORMAL` / `LARGE` / `XLARGE` | `NORMAL` |
| `displayContrast` | booléen | `false` |
| `displayTheme` | `SYSTEM` / `LIGHT` / `DARK` | `SYSTEM` |
| `displayReducedMotion` | booléen | `false` |
| `displayDyslexicFont` | booléen | `false` |

Validation Zod à la frontière. Chacun ne modifie que ses propres
réglages.

**Application, sans clignotement**
- Le layout racine lit les réglages de la session et pose des attributs
  sur `<html>` au rendu serveur : `data-text`, `data-contrast`,
  `data-theme`, `data-motion`, `data-font`.
- Le CSS réagit à ces attributs.
- Thème `SYSTEM` : `@media (prefers-color-scheme: dark)`.
- Mouvements : l'attribut ou `@media (prefers-reduced-motion)`.

**Effets**
- **Taille du texte** : `font-size` racine à 100 %, 112,5 % ou 125 %.
  Tailwind est en `rem`, donc tout suit, y compris les cibles tactiles.
- **Contraste renforcé** : redéfinition des variables de couleur (zinc
  clairs → foncés, bordures marquées). Vise le niveau AAA sur le texte
  courant.
- **Mode sombre** : redéfinition des variables de palette Tailwind v4
  (`--color-zinc-*`, `--color-white`, états) sous `data-theme="dark"`.
  - Les couleurs étant écrites en dur dans environ 63 fichiers, on ne
    touche pas aux composants ; on corrige ensuite les cas particuliers
    (texte blanc sur fond marine, par une variable dédiée qui ne
    s'inverse pas).
  - La barre latérale reste marine, d'une nuance plus profonde.
- **Mouvements réduits** : `transition` et `animation` désactivées
  globalement.
- **Police dyslexie** : OpenDyslexic (licence SIL OFL), auto-hébergée.
  Elle n'est téléchargée que si le réglage est actif : la `@font-face`
  est déclarée, mais la police n'est utilisée que sous
  `data-font="dyslexic"`.

## Réalisation (trois étapes livrables séparément)

1. **Visuel A.** Pas de migration. Avant/après des écrans principaux,
   montré avant le commit.
2. **Réglages, sans le thème sombre** : page, migration, taille,
   contraste, mouvements, police. Migration de production par script
   SQL Supabase, avant le push (voir la mémoire du projet).
3. **Mode sombre** : redéfinition de la palette, puis contrôle écran par
   écran en clair, sombre et contrasté.

## Vérification

- Contraste calculé, et non estimé, pour chaque couple texte/fond, dans
  chaque mode : AA partout, AAA visé en contraste renforcé.
- Tests :
  - validation et enregistrement des réglages ;
  - attributs posés sur `<html>` selon le compte ;
  - un agent ne peut pas modifier les réglages d'un autre.
- Captures avant/après :
  - écrans : tableau de bord, planning, factures, Paramètres, app agent
    « Aujourd'hui », page de connexion ;
  - formats : bureau et mobile ;
  - états : normal, grand texte, contraste, sombre.
- Relecture par l'agent `relecteur`, puis `tsc`, lint, tests, build et
  validation visuelle par l'utilisateur.

## Hors périmètre

- Portail client et page de connexion, hors suivi du thème de
  l'appareil.
- Refonte de la structure des pages ou de la navigation.
- Nouvelles couleurs, illustrations ou photos.
