# Numérisation des documents papier — document de travail

**Document 3/4** — à sortir au point 3 du déroulé de samedi, une fois les
vrais documents étalés (voir le fichier "Questions Vendredi / Samedi —
Cassandre", document 1/4). Version illustrée avec schéma : artefact
"Pipeline de numérisation" (document 4/4).

**Statut : brouillon.** Chantier distinct de l'outil actuel, pas encore dans
le périmètre validé (`docs/SPEC.md` ne le couvre pas — à ne pas construire
en dur tant que ce document n'est pas confirmé après la rencontre avec
Cassandre). Objectif ici : organiser ce qu'on sait déjà, pas figer une
architecture définitive.

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

## Direction d'architecture envisagée (à discuter, pas figée)

**Pipeline pressenti**, dans l'esprit "assisté, jamais automatique" déjà
appliqué ailleurs dans l'outil :
1. Dépôt d'un scan/photo (upload manuel pour commencer — un dossier
   surveillé automatiquement serait une itération suivante, plus complexe
   à faire fonctionner correctement).
2. OCR local (Tesseract) → texte brut.
3. Reconnaissance par rapprochement avec une liste de fournisseurs/types
   de documents déjà validés (comme le spike) — s'enrichit à chaque
   validation.
4. Extraction de champs par motifs simples quand c'est fiable ; sinon,
   champ laissé vide plutôt qu'une valeur inventée.
5. Écran de relecture humaine (ADMIN/PLANNER) : confirme ou corrige avant
   tout enregistrement définitif — aucune donnée comptable n'est actée
   sans ce passage.
6. Export CSV par catégorie (comptable / stock / achats) une fois validé.

**Où ça vivrait dans l'outil existant** (esquisse, à confirmer une fois le
volume/la sensibilité connus) :
- Stockage du scan original : Supabase Storage, même mécanisme que
  `src/lib/uploads.ts` (déjà utilisé pour les justificatifs d'absence et
  les photos de main courante) — pas de nouveau système à inventer.
- Accès : `requireRole(user, ["ADMIN", "PLANNER"])`, même garde que le
  reste du back-office — pas d'accès agent envisagé ici.
- Nouvel espace dans `(back-office)`, pas mêlé aux modules métier
  existants (contrats, planning) tant que le volume et la nature réelle
  des documents ne sont pas connus.
- Modèle de données : à esquisser après samedi seulement — trop tôt pour
  fixer des champs (`documentType`, montants, etc.) sans avoir vu la vraie
  variété de documents.

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

1. Samedi : regarder les vrais documents apportés par Cassandre, retester
   le spike dessus en direct, obtenir ses réponses aux questions 33-38.
2. Une fois ces réponses connues : reprendre ce document, fixer un
   périmètre v1 réaliste (quels types de documents, quel modèle de
   données, quel écran de relecture).
3. Passer par le mode plan habituel du dépôt avant tout code réel touchant
   à l'outil ou à sa base de données — ce chantier qualifie clairement pour
   ça (nouveau module, pas encore dans `docs/SPEC.md`).
