# Prompts Claude Code — DL Propreté

Copier un prompt à la fois. Rester en mode plan jusqu’à validation.

## Session 0 — conception

Lis `docs/SPEC.md` et `docs/DATA-MODEL.md`. N’écris pas encore d’application.
Propose une architecture de dossiers Next.js, le schéma Prisma v1 conforme
au modèle, et une liste de modules dans l’ordre d’implémentation.
Signale les ambiguïtés. Écris le résultat dans `docs/ARCHITECTURE.md`.
N’installe rien.

## Session 1 — fondation

À partir de `docs/ARCHITECTURE.md`, initialise Next.js + TypeScript + Tailwind
+ Prisma + PostgreSQL + Better Auth avec les rôles ADMIN, PLANNER, AGENT.
Crée le schéma Prisma complet, la première migration, un seed minimal
(1 admin, 2 agents, 1 client, 1 site, 1 contrat).
Aucune page métier. Vérifie `npx tsc --noEmit` et `npm test`.
Mets à jour la section Commandes de `CLAUDE.md`.

## Session 2 — clients et sites

CRUD Client et Site pour ADMIN/PLANNER.
Liste, fiche, création, désactivation (pas de suppression physique s’il existe
un contrat). Tests des droits : un AGENT reçoit 403.

## Session 3 — contrats et vacations types

CRUD Contract + ServiceTemplate.
Un contrat ACTIVE doit avoir startsOn, endsOn, monthlyAmountHT.
Empêcher un chevauchement de deux contrats ACTIVE sur le même site.
UI : fiche contrat avec liste des vacations hebdomadaires.

## Session 4 — génération du planning

À partir des ServiceTemplate d’un contrat ACTIVE, génère les Shift
sur une plage de dates (par défaut 8 semaines glissantes).
Idempotence : relancer ne duplique pas.
Affectation d’agents avec détection de chevauchement horaire.
Statut du Shift : UNSTAFFED / PARTIALLY_STAFFED / PLANNED selon requiredAgents.
Vues : semaine par agent, jour par site.
Tests des conflits.

## Session 5 — pointage agent

Pages AGENT : planning du jour, bouton « Démarrer » / « Terminer ».
TimeEntry lié au Shift si possible.
Un seul TimeEntry OPEN par agent.
L’agent ne peut plus modifier une entrée VALIDATED.
Page ADMIN : validation / rejet des pointages de la veille.
Seed : quelques pointages de démo.

## Session 6 — absences et remplacements

Déclaration d’Absence par l’AGENT.
Validation ADMIN.
Si APPROVED, les Assignment de l’agent sur la période passent REPLACED
et les Shift redeviennent UNSTAFFED ou PARTIALLY_STAFFED.
UI ADMIN : « Trouver un remplaçant » = agents sans conflit sur le créneau.
Pas de champ diagnostic.

## Session 7 — facturation

Génération mensuelle : pour chaque Contract ACTIVE couvrant le mois,
sommer les durées des Shift du mois hors CANCELLED
(ou indicativeMonthlyHours si billingBasis = FLAT_INDICATIVE_HOURS),
créer une Invoice DRAFT avec une ligne PLANNED_HOURS
(heures prévues × hourlyRateHT). Afficher en lecture seule
les heures pointées validées du même mois (contrôle, non facturées).
Un Shift déjà inclus dans une facture ISSUED ne doit pas être refacturé.
Numérotation `F-YYYY-NNNN`.
Passage ISSUED verrouille le numéro.
PDF A4 mentions légales DL Propreté (SIRET 53173924100044, TVA FR64531739241,
adresse Colombelles).
Saisie d’un Payment et mise à jour du statut.
Prestation ADHOC ajoutable sur la facture brouillon.
Ne pas connecter de plateforme agréée.

## Session 8 — tableau de bord et export

Dashboard ADMIN :
- vacations non pourvues J et J+1 ;
- pointages OPEN de plus de 12 h ;
- factures ISSUED impayées ;
- contrats qui finissent dans 60 jours.
Export CSV des TimeEntry VALIDATED d’un mois
(agent, site, début, fin, durée).

## Session 9 — durcissement

Passe de sécurité : headers, rate limit login, taille max upload justificatif
(5 Mo, PDF/JPEG), sauvegarde documentée de Postgres,
page paramètres entreprise (raison sociale, coordonnées bancaires pour le PDF).
Checklist manuelle dans `docs/QA.md`.
