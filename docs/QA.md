# Checklist QA manuelle

À dérouler avant toute mise en production ou après une évolution touchant
plusieurs modules. Comptes de démo : voir `CLAUDE.md` (à changer avant
tout déploiement au-delà du poste local — voir audit de sécurité du
15/09/2026 : ces identifiants sont documentés dans un dépôt public).

**Mise à jour du 15/09/2026** : le texte décrivait encore l'ancien
pointage Démarrer/Terminer (deux gestes), abandonné le 12/09/2026 au
profit d'un geste unique. Ajout des sections pour les modules livrés
depuis la dernière relecture de ce document (numérisation, portail
client, prospects/devis, équipe). Les cases cochées `[x]` ont été
vérifiées en session le 15/09/2026, avec des données de test créées et
nettoyées pour l'occasion — **jamais contre de vraies données client**
(un brouillon de facture généré par erreur sur un client existant a été
supprimé sans jamais être émis, voir la découverte sur l'IBAN
ci-dessous). Les cases `[ ]` restent à dérouler : déclaration d'absence
avec justificatif, validation/rejet d'un pointage, prospects/devis,
création d'agent, portail client de bout en bout — non couverts par
cette passe, faute de temps, pas parce qu'ils posent un problème connu.

## Auth et rôles

- [x] Connexion ADMIN avec le compte de démo.
- [ ] Connexion PLANNER et AGENT avec les comptes de démo.
- [x] Mauvais mot de passe → message "Identifiants incorrects.".
- [x] 6 tentatives de connexion échouées d'affilée → "Trop de tentatives,
      réessayez plus tard." — vérifié aussi avec le bon mot de passe
      pendant le blocage : refusé quand même, comme attendu.
- [x] Aucune route métier accessible sans session (redirection `/login`).
- [x] Un AGENT ne voit que son propre planning / pointage / absences —
      vérifié en profondeur lors de l'audit de sécurité du 15/09 (accès
      direct par ID testé, pas seulement via la navigation).
- [x] Un PLANNER ne voit pas "Tableau de bord" ni "Paramètres" (réservés
      ADMIN) — confirmé dans `src/app/(back-office)/layout.tsx`.
- [x] Un PLANNER ne peut pas lire/valider/rejeter un document marqué
      sensible (RH/santé), même en visant son ID directement — corrigé
      et testé le 15/09 (`ForbiddenError` sur les trois actions).

## Clients et sites

- [x] Créer un client, un site rattaché.
- [x] Désactiver un client sans le supprimer physiquement (le site
      rattaché reste visible sur la fiche).
- [x] Client depuis / Actif depuis : une date antérieure (ex. 2019) est
      acceptée et s'affiche correctement.

## Contrats et vacations types

- [x] Créer un contrat-cadre, ajouter un site avec son tarif et son volume
      mensuel indicatif.
- [ ] Vacation type récurrente sur un site du contrat.
- [x] Deux contrats `ACTIVE` du même client qui se chevauchent sur le même
      site : le second refuse d'ajouter ce site ("Un contrat actif existe
      déjà sur ce site pour une période qui chevauche.").
- [x] Lien de téléchargement du PDF et boutons de statut de signature
      (Non envoyé → Envoyé → Signé) présents sur la fiche contrat.

## Planning

- [ ] Génération des occurrences de `Shift` à partir des vacations types.
- [ ] Un agent ne peut pas être affecté sur deux créneaux qui se chevauchent.
- [ ] Vue jour et vue semaine correctes.
- [x] Génération assistée (`/planning/generate`) : propose un agent par
      créneau manquant (24/24 sur la période testée), rien n'est affecté
      tant que "Valider les affectations" n'est pas cliqué.

## Pointage — geste unique "Terminer" (depuis le 12/09/2026)

- [x] Un agent termine une vacation en un seul geste, avec une remarque
      libre optionnelle — pas de suivi d'heure d'arrivée.
- [x] Un agent ne peut pointer que sur une vacation à laquelle il est
      affecté — un autre `shiftId` est refusé ("Vous n'êtes pas affecté à
      cette vacation.") — corrigé et testé le 15/09 (avant cette date, un
      agent pouvait pointer sur n'importe quelle vacation).
- [ ] Un second pointage sur la même vacation est refusé (idempotence).
- [ ] Validation/rejet d'un pointage par ADMIN ou PLANNER.
- [ ] Un pointage validé n'est plus modifiable par l'agent.
- [ ] La durée retenue pour la paie est celle **planifiée** de la
      vacation, jamais une mesure réelle (décision du 12/09).

## Absences

- [ ] Déclaration d'un arrêt maladie avec justificatif (PDF ou JPEG).
- [ ] Fichier > 5 Mo refusé.
- [ ] Fichier d'un autre type (ex. `.docx`, `.png`) refusé.
- [ ] Validation ADMIN uniquement (PLANNER n'a pas accès à cette action).
- [ ] Les créneaux planifiés de l'agent absent passent "non pourvus" et un
      remplaçant peut être affecté ("Trouver un remplaçant" sur
      `/absence-review`).
- [x] La note écrite de l'agent est visible côté ADMIN (relecture directe
      + historique).
- [x] L'historique des absences (`/absence-review`) liste le passé et le
      futur, tous statuts, avec filtre par statut fonctionnel.

## Facturation

- [x] Génération des factures du mois à partir des heures planifiées
      (brouillon correctement calculé : heures × tarif horaire du site).
- [x] PDF généré pour une facture en brouillon (200 OK).
- [ ] Une facture émise ne peut pas être supprimée (avoir uniquement) —
      **non vérifiable pour l'instant**, voir ci-dessous.
- [x] **Découverte plus grave que prévu** : l'émission d'une facture est
      **bloquée en dur** tant que l'IBAN n'est pas renseigné dans
      Paramètres ("Mentions légales incomplètes : IBAN... Compléter les
      paramètres avant d'émettre.", statut reste Brouillon). Ce n'est pas
      qu'un défaut d'affichage sur le PDF comme supposé initialement :
      **aucune facture ne peut être émise du tout** tant que ce champ est
      vide. À corriger en priorité — voir `CompanyProfile.iban`.

## Tableau de bord et export

- [x] Indicateurs à jour : sites non pourvus, factures impayées, contrats
      <60 jours — vérifiés en direct le 15/09 (et nettoyage de données de
      test qui polluaient ces chiffres en base partagée).
- [x] Export CSV des pointages validés du mois (200 OK).

## Numérisation des documents (module livré le 15/09/2026)

- [x] Dépôt d'un dossier/fichier, OCR local, montant/date/référence
      extraits automatiquement quand le motif est reconnaissable —
      vérifié sur un vrai document réel (facture OVH).
- [x] Un fichier déjà déposé (même contenu) est ignoré silencieusement au
      redépôt.
- [x] Boucle d'apprentissage fournisseur : un fournisseur mémorisé à la
      validation est reconnu automatiquement sur le document suivant.
- [x] Export CSV des documents validés, par catégorie.

## Portail client

- [ ] Envoi d'un lien magique depuis la fiche client, réception,
      connexion, consultation des factures et rapports de visite.
- [ ] Lien expiré (>15 min) ou déjà utilisé refusé.
- [x] Consommation du lien magique atomique (pas de double-utilisation en
      cas de requêtes concurrentes) — corrigé et testé le 15/09 (test de
      concurrence automatisé).
- [ ] Un client ne peut voir que ses propres factures/rapports (pas
      d'accès croisé par changement d'ID dans l'URL).

## Prospects et devis

- [ ] Créer un prospect, un devis, conversion en client signé.

## Équipe

- [ ] Créer un agent/planificateur, désactiver, réinitialiser un mot de
      passe.
- [ ] Date d'embauche : une date antérieure est acceptée et conservée.

## Durcissement / sécurité

- [x] En-têtes de sécurité présents (`X-Frame-Options`,
      `X-Content-Type-Options`, `Strict-Transport-Security`,
      `Content-Security-Policy` en production uniquement — vérifier en
      prod, désactivée volontairement en dev).
- [ ] Page Paramètres (ADMIN) : modification enregistrée et reflétée dans
      le prochain PDF de facture.
- [x] `docs/BACKUP.md` à jour et **restauration réellement testée** (sur
      un cluster local jetable, jamais contre une base partagée) —
      dump/restore vérifiés bit à bit le 15/09/2026 (30 tables, nombre de
      lignes identique).
- [x] Dépendances : vulnérabilités connues corrigées (`nodemailer`,
      `deepmerge-ts`) — reste `@vitest/mocker` (outil de test, jamais
      livré en production, non corrigé volontairement).
- [ ] **Mot de passe admin de démo (`changeme123`) changé** — signalé
      comme risque actif le 15/09 (dépôt GitHub public), à confirmer.

## Site vitrine

- [ ] Page CGV (conditions générales de vente) — absente, à créer.
- [ ] Contenu du blog — 2 articles seulement, à étoffer.
