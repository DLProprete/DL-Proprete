# Identité de marque DL Propreté

Charte produite et validée sur un outil externe (Claude Design, plusieurs
allers-retours de relecture les 9-10/09/2026). Ce document trace ce qui a
été retenu et où ça vit dans le code — la charte elle-même n'existait
avant ça que dans un outil tiers, sans trace dans le dépôt.

## Logo

Monogramme "DL" en bloc plat : fond bleu marine (`#0F2A43`), une fine
bande en bleu clair (`#3E6B8C`) en bas du bloc, texte "DL" blanc. Aucun
dégradé, aucune ombre, aucun symbole illustratif ajouté.

**À éviter absolument** (règles de la planche validée) : déformer ou
incliner le bloc, poser le logo sur une photo chargée sans aplat de
fond, remplacer le bleu marine par une autre teinte, ajouter une ombre
ou un dégradé.

**Tailles minimales** : bloc seul 16 px (favicon) ; bloc + nom 28 mm en
impression.

**Dans le code** :
- `site/src/components/logo.tsx` — composant du site.
- `src/components/logo.tsx` (racine du dépôt) — composant de l'outil
  interne, même principe visuel, structure différente (nom de fichier
  volontairement identique).
- `site/src/app/icon.tsx`, `site/src/app/opengraph-image.tsx` — favicon
  et image de partage social, générés par code (`next/og`), pas des
  fichiers binaires statiques à maintenir à la main.

## Couleurs

| Rôle | Valeur | Usage |
|---|---|---|
| Bleu de marque | `#0F2A43` | Logo, badges d'icône, `--brand` dans `site/src/app/globals.css` |
| Bleu clair (dérivé) | `#3E6B8C` | Bande du logo, détail "élément traité" des pictogrammes — jamais utilisé seul |
| Fond clair (dérivé) | `#D6E1EA` | Aplats de fond ponctuels (ex. avatar réseaux sociaux) |
| Papier | `#F7F6F3` | Fond neutre des supports imprimés |

**Écart volontaire, à ne pas "corriger"** : le site utilise par ailleurs
un accent vert (`--accent`/`--accent-dark`, `#12a37a`/`#0c8563`) pour les
boutons d'action et les liens — absent de la charte de marque, mais
confirmé comme un choix délibéré par l'utilisateur (10/09/2026), pas un
oubli. Ne pas proposer de le remplacer par le bleu de la charte.

## Typographie

IBM Plex Sans (titres, texte courant) et IBM Plex Mono (surtitres,
étiquettes) — déjà en place sur le site (`site/src/app/layout.tsx`,
`next/font/google`) depuis la refonte du 05/09/2026, avant même la
planche de marque formelle. Aucun changement lié à ce chantier.

## Système de pictogrammes

Grille 24 px, angles droits privilégiés, deux tons : trait principal en
`currentColor` (marine sur fond clair), un détail rempli en bleu clair
(`#3E6B8C`) qui marque l'élément spécifiquement traité par l'icône —
jamais l'inverse, jamais les deux couleurs à poids égal.

**Écart assumé par rapport à la planche** : le trait des icônes reste à
`1.6` (valeur déjà en place dans `site/src/components/icons.tsx`,
partagée par les 15 icônes du fichier) plutôt que le `1.7` de la
planche — l'écart est imperceptible à la taille d'affichage réelle
(14-24 px), et changer cette valeur partagée aurait touché des icônes
sans rapport avec la charte (flèches, horloge...).

**Icônes couvertes par la charte, dans le code** : `FactoryIcon`
(nettoyage industriel), `BuildingIcon` (bâtiments &amp; bureaux),
`BottleIcon` (produits d'entretien), `ToolboxIcon` (manutention),
`ZoneIcon` (zone d'intervention) — toutes dans
`site/src/components/icons.tsx`. `PinIcon` n'en fait pas partie : il
représente une adresse unique (fiche contact, siège), pas la charte de
marque.

**Non couvert pour l'instant** : les icônes "compléments" de la planche
(vitrerie, sols techniques, hygiène sanitaire, équipe formée, périmètre
défini, réponse 24h, devis &amp; comptes-rendus) ont été validées sur la
planche mais ne sont pas encore codées — aucun usage actuel sur le site
ne les nécessite.

## Applications validées sur la planche, pas encore produites

Flanc de véhicule, tenue brodée, tampon monochrome — dépendent de
supports physiques réels (véhicules floqués, tenues à broder) dont
l'existence n'est pas confirmée (voir le questionnaire Cassandre,
question 12). Rien à coder ici : ce sont des fichiers d'export pour un
imprimeur/brodeur, hors périmètre du dépôt.
