# Numérisation des documents papier — document de travail

**Document 3/4** — à sortir au point 3 du déroulé de samedi, une fois les
vrais documents étalés (voir le fichier "Questions Vendredi / Samedi —
Cassandre", document 1/4). Version illustrée avec schéma : artefact
"Pipeline de numérisation" (document 4/4).

**Statut : v1 en cours de développement** (branche à part, pas encore
fusionnée sur `main`). Le volume et la variété réelle des documents restent
inconnus — le choix a été fait de construire un pipeline volontairement
générique (catégories et champs éditables par l'humain, jamais figés dans
le code) plutôt que d'attendre cette confirmation. Voir "Direction
d'architecture retenue" ci-dessous pour ce qui a été construit.

## Contexte

Cassandre récupère les archives papier de son père (comptabilité, achats,
stock...) — des feuilles volantes, rien de trié ni rangé. Elle va les
scanner ou les photographier. Besoin : un outil qui reprend ces documents
(par dépôt de fichier ou dossier local), les reconnaît, les classe, en
extrait les informations utiles, et peut sortir des résumés ou des exports
CSV/tableur exploitables par sa comptabilité.

Décision actée avec l'utilisateur (10/09) : viser une solution **gratuite et
locale en priorité** (OCR classique), une IA payante seulement en dernier
recours pour ce que l'OCR seul ne peut pas résoudre — pas l'inverse.

## Ce qu'on a déjà validé techniquement (preuve de concept, 10/09)

Script jetable (`scripts/_spike-doc-extraction.ts`, non intégré à
l'outil), testé sur un vrai document (bon de commande OVHcloud PDF) :

**Ça marche :**
- Lecture OCR locale et gratuite (Tesseract, via `tesseract.js`) sur un
  PDF imprimé en français — texte globalement lisible, quelques confusions
  de caractères attendues (ex. "diproprete" pour "dlproprete" — un `l` lu
  comme un `i`).
- Boucle d'apprentissage par validation humaine : un fournisseur inconnu
  est demandé une fois, mémorisé, puis reconnu automatiquement sur un
  document ultérieur — validé en conditions réelles (OVHcloud reconnu au
  deuxième passage).

**Ça ne marche pas encore, à ne pas sous-estimer :**
- L'extraction de champs (montant, date, référence) est bien plus fragile
  que la reconnaissance d'un nom de fournisseur — un simple motif "Total
  TTC : ..." ne suffit pas dès que le document a une autre mise en page
  (le bon de commande testé n'a pas de montant total explicite sur sa
  première page). Nécessitera probablement une aide ponctuelle d'IA sur
  les champs, pas seulement sur le fournisseur.
- Les documents multi-pages ne sont pas gérés dans le spike (une seule
  page lue).
- Rien testé sur du manuscrit ou du papier très dégradé — l'utilisateur
  indique qu'il devrait y en avoir peu, mais on ne le saura vraiment
  qu'avec les vrais documents samedi.

## Décisions déjà actées

- **Validation humaine systématique** avant qu'une donnée extraite soit
  considérée fiable — jamais de confiance aveugle sur un montant ou une
  TVA. Cohérent avec la philosophie déjà en place ailleurs dans l'outil
  (génération assistée du planning, main courante) : l'IA propose, un
  humain valide.
- **Numériser dispense de garder les originaux papier** (confirmé par
  Cassandre le 10/09, à faire tracer par écrit auprès de son
  expert-comptable pour la forme).
- **Gratuit/local d'abord** (OCR Tesseract), IA payante seulement pour les
  cas que l'OCR ne résout pas.

## Réponses reçues (10/09, questions 33-38)

- **Scanner, pas photo téléphone** (Q37) — bonne nouvelle : un scan produit
  une image bien plus régulière (éclairage, angle) qu'une photo, ce qui
  devrait améliorer sensiblement la qualité de l'OCR par rapport au test
  du spike.
- **Documents sensibles confirmés** (Q36, RH/santé) — à isoler du flux
  comptable général dès la conception, pas une hypothèse à vérifier.
- **Validation par une seule personne** (Q38, Cassandre elle-même) —
  simplifie l'accès : pas besoin de gérer plusieurs relecteurs pour une v1.
- **Volume et types précis toujours inconnus** (Q33-35) — la question sur
  les types de documents n'était pas claire pour Cassandre ("je ne
  comprends pas la question") ; à reformuler avec des exemples concrets
  plutôt que des catégories abstraites la prochaine fois. Le volume/la
  période restent à connaître "au retour de vacances".

## Questions encore ouvertes

Le volume réel, la période couverte, et la variété exacte de mise en page
restent inconnus tant qu'on n'a pas vu de vrais documents samedi — la
seule chose qui permettra de juger sérieusement de la faisabilité à
l'échelle.

## Direction d'architecture retenue

**Pipeline construit**, dans l'esprit "assisté, jamais automatique" déjà
appliqué ailleurs dans l'outil :
1. Dépôt d'un dossier entier en un geste (`<input type="file"
   webkitdirectory multiple>`) — pas de dossier surveillé en continu,
   écarté explicitement (complexité et risques disproportionnés pour un
   usage ponctuel).
2. OCR local (`tesseract.js`, langue française, fichier de langue committé
   dans `assets/tessdata/` — pas de dépendance réseau à l'exécution) →
   texte brut. Traitement document par document (un bouton "Traiter les
   suivants" qui appelle une Server Action par document, jamais une
   boucle unique côté serveur sur tout le lot) pour rester sous les
   limites de temps d'une fonction serverless.
3. Reconnaissance par rapprochement avec la table `KnownSupplier`
   (sous-chaîne insensible à la casse) — s'enrichit à chaque validation
   ("mémoriser ce fournisseur").
4. Extraction de champs par motifs simples (montant TTC, date) quand
   fiable ; sinon, champ laissé vide plutôt qu'une valeur inventée.
5. Écran de relecture humaine (ADMIN/PLANNER) : confirme ou corrige avant
   tout enregistrement définitif (statut `VALIDATED`) — aucune donnée
   comptable n'est actée sans ce passage.
6. Export CSV par catégorie (`COMPTABLE`/`ACHATS`/`STOCK`), uniquement les
   documents validés.

**Où ça vit dans l'outil** :
- Stockage du scan original : Supabase Storage via `src/lib/uploads.ts`
  (déjà utilisé pour les justificatifs d'absence et les photos de main
  courante) — pas de nouveau système.
- Accès : `requireRole(user, ["ADMIN", "PLANNER"])` pour le dépôt/OCR/
  relecture, comme le reste du back-office. Un document marqué "sensible"
  (RH/santé) n'est visible et listé que pour ADMIN — garde plus stricte,
  cohérente avec la règle dure "pas de diagnostic médical".
- Nouvel espace `(back-office)/documents`, séparé des modules métier
  existants.
- Modèle de données : `ScannedDocument` (statut, texte OCR, catégorie,
  montant, date, référence, `isSensitive`) + `KnownSupplier` (boucle
  d'apprentissage) — voir `docs/DATA-MODEL.md`.

**Limitation connue et acceptée pour cette v1** : un PDF sans calque texte
(scan pur image, cas le plus probable pour de vieux papiers) n'est pas
rasterisé pour l'OCR — rasteriser demanderait `canvas`, une dépendance
native fragile sur un hébergement serverless. Concrètement : l'OCR
fonctionne sur les images (JPEG/PNG) et sur les PDF qui contiennent déjà un
calque texte ; un PDF scan pur reste sans texte OCR et se complète
entièrement à la main en relecture. Recommandation pratique : scanner en
JPEG/PNG plutôt qu'en PDF quand c'est possible.

## Hors périmètre, au moins pour une première version

- Pas de dossier local surveillé automatiquement (complexité et risques
  largement supérieurs à un simple dépôt manuel pour commencer).
- Pas d'intégration directe à un logiciel comptable tiers — l'export CSV
  suffit pour l'instant, sauf besoin exprimé.
- Pas de traitement spécifique du manuscrit tant qu'on n'a pas mesuré à
  quel point c'est réellement présent.

## Risques et points de vigilance

- **Qualité variable des vieux papiers** : à mesurer avec de vrais
  échantillons avant toute promesse de résultat.
- **Coût si volume important** : si l'OCR seul ne suffit pas et qu'il faut
  une IA payante par document, le coût dépend directement du nombre de
  documents — à chiffrer une fois le volume connu (question 34).
- **Documents sensibles** (RH/santé éventuels dans les archives du père) :
  à isoler et traiter à part, pas dans le même flux que la comptabilité
  générale.

## Prochaines étapes

1. Vérifier la v1 avec de vrais documents (voir "Vérification" du plan
   d'implémentation) : qualité de l'OCR sur de vieux papiers, présence
   réelle de PDF sans calque texte, volume réel.
2. Selon ce que ça donne : ajuster les motifs d'extraction (montant/date),
   éventuellement une aide ponctuelle d'IA si les regex ne suffisent pas
   (dernier recours, pas le point de départ).
3. Fusionner sur `main` une fois validé dans le worktree
   (`worktree-numerisation-documents`), après revue.
