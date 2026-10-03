# Identité de marque DL Propreté

Source de vérité : **charte graphique v1.0 (octobre 2026)**, validée par la
direction (PDF de 13 pages, hors dépôt) et ses fichiers SVG originaux,
archivés tels quels dans `docs/brand/`. Elle remplace entièrement la charte
de septembre 2026 (monogramme « DL » en bloc, bleu clair `#3E6B8C`, IBM Plex).

## Principes de la charte

- **Le nom est le logo** : wordmark « DL Propreté » en Inter Black, sur une
  ligne, jamais empilé, accent toujours présent (y compris PROPRETÉ).
- **Trois usages** : principale (devis, véhicule, enseigne, site), monogramme
  (favicon, profil, veste — quand le nom ne tient pas), signature longue avec
  « Depuis 2011 » (couvertures uniquement). Une seule version par support.
- **Interdit** : monogramme collé à gauche du nom, pictogramme dans le logo
  (balai, seau, goutte…), or, ombre, dégradé, slogan intégré, bas de casse.
- **Zone de protection** = hauteur du D. Tailles minimales : wordmark 120 px
  à l'écran, monogramme 32 px.

## Couleurs

| Rôle | Valeur |
|---|---|
| Marine (signe, aplats) | `#243746` |
| Noir (impression 1 couleur) | `#1A1A1A` |
| Gris (mentions secondaires) | `#5E6E78` |
| Fond (aplats clairs) | `#F4F6F7` |

Interdit : or, dégradé, jaune de marquage, **vert ménager**, et toute teinte
plus claire du marine « pour faire joli ».

## Typographie

Inter, seule police de la marque. Black = logo uniquement ; Medium = titres
de documents ; Regular = texte courant.

## Pictogrammes

Quatre signes métier (`docs/brand/icone-*.svg`) : bâtiment, industriel,
produits, intervention. Trait 1,6 px sur grille 24, marine seul, jamais dans
le logo ni à côté du wordmark.

## Dans le code

- **Originaux** : `docs/brand/*.svg` — à remettre à l'imprimeur/poseur, ne
  jamais modifier.
- **Versions web** : `site/public/brand/` et `public/brand/` — copies dont
  seul le `viewBox` est recadré sur le dessin (autorisé p. 5 de la charte) ;
  la zone de protection est assurée par l'espacement autour.
- **Site** : `site/src/components/logo.tsx` (wordmark), couleurs dans
  `site/src/app/globals.css` (les tokens `accent*` valent désormais le
  marine — le vert a disparu), Inter dans `site/src/app/layout.tsx`,
  pictogrammes dans `site/src/components/icons.tsx` (`BatimentIcon`,
  `IndustrielIcon`, `ProduitsIcon`, `InterventionIcon`), favicon / icône
  Apple / image de partage générés depuis les SVG officiels
  (`site/src/lib/brand-asset.ts`).
- **Outil interne** : `src/components/logo.tsx` (`Logo` = wordmark,
  `LogoBadge` = monogramme seul), marine dans `src/app/globals.css`
  (`--color-brand-*`), favicon, icône Apple et icônes PWA depuis le
  monogramme officiel (`src/lib/brand-asset.ts`), `theme_color` du manifest.

## Cartes de visite (QR code)

Le QR code des cartes pointe vers `https://www.dlproprete.fr/c/<slug>`
(page contact + bouton « Ajouter aux contacts » qui sert un `.vcf`). Les
coordonnées vivent dans `site/src/lib/contact-cards.ts` : les modifier puis
redéployer met à jour toutes les cartes déjà imprimées, sans service externe.

- Fichiers à remettre à l'imprimeur : `docs/cartes-de-visite/qr-<slug>.svg`
  (vectoriel, marine sur blanc, marge de 4 modules incluse à conserver).
- **Le slug et le domaine sont gravés dans les cartes** : ne jamais renommer
  `cassandre`, ni laisser expirer `dlproprete.fr`.
- Taille imprimée conseillée : 18 mm de côté minimum.

## Écarts assumés (validés par l'utilisateur, 02/10/2026)

- **Titres du site en Inter SemiBold**, pas Medium : hiérarchie lisible à
  l'écran ; le Black reste réservé au logo.
- **Outil interne en Inter depuis le 03/10/2026** (auparavant police
  système) : servie par l'application via next/font, sans appel externe,
  conservée par le cache du navigateur après la première visite (la page
  hors connexion reste en police système).
- **Nuances fonctionnelles du marine** (survol, fond de sélection) dans les
  deux applications : états d'interface, pas des teintes décoratives.
- **Joints arrondis des pictogrammes** conservés tels que fournis dans les
  SVG, alors que le texte de la charte parle de « coins vifs ».
- **Image de partage sans texte** : `next/og` n'embarque pas Inter.

## Incohérence à signaler dans la charte

La p. 4 annonce « Trois fichiers, pas davantage », la p. 5 en liste cinq
(logo, noir, blanc, monogramme, signature).
