# Fondations visuelles

Un seul système, deux contextes d'usage opposés. Le back-office est utilisé au
calme sur un écran d'ordinateur : la densité y est une qualité. L'écran agent
est utilisé dehors, à 6 h, à une main, avec des gants : une décision par écran,
de grosses cibles, un contraste élevé. Mêmes couleurs et même typographie ;
échelles de taille et de cible tactile différentes.

## Règles

**La couleur d'état est une donnée, pas une décoration.** Un seul accent
(`brand`, marine #243746) pour l'action, et trois couleurs d'état : ambre = à traiter,
rouge = erreur ou retard, vert = validé. Aucun bouton secondaire coloré — dès
qu'on colore ce qui n'est pas un état, l'alerte cesse de se voir.

**Identité (03/10/2026).** Barre latérale en aplat marine avec le logo blanc,
fond de page `#F4F6F7` (« Fond » de la charte), titres de page en marine,
pictogrammes métier pour les écrans vides (`EmptyState`), pastilles de
synthèse monochromes marine. Aucune autre teinte décorative.

**Contraste AA partout.** `text-zinc-400` (2,6:1 sur blanc) et `text-zinc-500`
(4,6:1 sur blanc, mais sous le seuil AA sur le fond de page #F4F6F7 : y
utiliser `text-zinc-600`) ont été remplacés par `text-zinc-500` et `text-zinc-600` sur l'ensemble
des écrans. Ça se voyait peu sur un MacBook neuf dans un bureau ; c'était
illisible sur le téléphone d'un agent, dehors. Les bordures de champ sont
passées de `zinc-300` à `zinc-400` (une bordure de champ à 1,5:1 n'est pas
perceptible).

**Cibles tactiles.** `--tap-min` (44 px) est le plancher de tout élément
interactif ; `--tap-field` (56 px) s'applique aux actions de l'écran agent.

**Chiffres à chasse fixe.** Toutes les cellules de tableau sont en
`tabular-nums` : heures, durées et euros s'alignent en colonne. Hors tableau,
utiliser la classe `.num`.

**Focus visible.** Anneau `:focus-visible` sur tout élément interactif, jamais
supprimé. La saisie au clavier est le mode d'usage principal de la direction.

## Classes

Définies dans `src/app/globals.css`, à utiliser plutôt que de recomposer les
mêmes chaînes d'utilitaires.

| Classe | Usage |
|---|---|
| `.btn` + `.btn-primary` | action principale |
| `.btn` + `.btn-secondary` | action secondaire (bordure, fond blanc) |
| `.btn` + `.btn-dark` | action neutre appuyée |
| `.btn` + `.btn-danger` | action destructive |
| `.btn-sm` / `.btn-xs` | variantes compactes — back-office seulement |
| `.btn-field` | action pleine largeur de l'écran agent (56 px) |
| `.btn-stop` | fin de vacation (ambre, volontairement distinct du démarrage) |
| `.field` / `.field-sm` | champ de formulaire |
| `.chip` | puce à cocher (jours de la semaine) |
| `.card` | surface |
| `.alert` + `.alert-danger` / `.alert-warning` / `.alert-info` | messages |
| `.num` | chiffres alignés hors tableau |
| `.stat-card` | carte de synthèse (compteur + icône) |
| `.stat-badge` | pastille d'icône monochrome marine sur une stat-card |
| `.card-table` | tableau de liste encadré (remplace les classes utilitaires répétées par ligne) |

## Typographie

Inter, la police de la charte, servie par l'application via next/font : les
fichiers sont embarqués au build, sans appel à Google, et conservés par le
cache du navigateur après la première visite. La page hors connexion reste en
police système (le service worker n'intercepte pas `/_next/*`). La pile
système (SF Pro, Roboto) ne sert que de repli le temps du chargement.

## Ce qu'on ne fait pas

Glassmorphism, dégradés, ombres portées marquées, animations d'entrée,
illustrations, mode sombre. Un outil ouvert deux cents fois par mois doit être
ennuyeux et rapide. Les transitions restent à 150 ms.
