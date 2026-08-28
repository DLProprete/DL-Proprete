# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# DL Propreté — instructions Claude Code

Outil interne pour une entreprise de nettoyage (Calvados) : contrats de sites
sur 12 mois, planning d’agents, pointage mobile, absences, facturation en
régie récurrente au mois. 8 clients et 16 agents au démarrage. Pas d’espace
client. Paie externalisée (export uniquement). Hébergement France.

Lire `docs/SPEC.md` et `docs/DATA-MODEL.md` avant toute conception.
Ne pas inventer de module hors spec.

## État du dépôt

Fondation posée (Session 1) : Next.js + TypeScript + Tailwind + Prisma +
Better Auth, schéma complet, première migration, seed minimal. Aucune page
métier. `docs/PROMPTS.md` détaille le déroulé prévu session par session
(2+ = modules métier). Suivre cet ordre, une session à la fois, un commit
par fonctionnalité.

**Avant de développer**, créer un `.env` local (non commité, Claude Code n'a
pas le droit de le lire/écrire) avec :

```
DATABASE_URL="postgresql://user:password@localhost:5432/dlproprete?schema=public"
BETTER_AUTH_SECRET="une valeur aléatoire longue"
BETTER_AUTH_URL="http://localhost:3000"
```

La migration initiale (`prisma/migrations/*_init/`) avait été générée hors
ligne (pas de Postgres en Session 1) puis appliquée et complétée une fois la
base disponible. Une deuxième migration (`*_add_account_issuer`) ajoute
`Account.issuer`, requis par Better Auth pour retrouver le compte
email+mot de passe (voir `docs/ARCHITECTURE.md` section 3). Les deux sont
appliquées et vérifiées : seed rejoué, connexion testée avec
`auth.api.signInEmail` (bon mot de passe accepté, mauvais rejeté).

Le seed insère `User` + `Account` directement en Prisma avec
`hashPassword` de `better-auth/crypto` (pas de compte auto-créable :
`disableSignUp: true`). Identifiants de démo : `admin@dlproprete.fr`,
`agent1@dlproprete.fr`, `agent2@dlproprete.fr`, mot de passe `changeme123`
pour les trois — **à changer avant tout déploiement au-delà du poste local**.

## Stack imposée

- Next.js App Router, TypeScript strict (`no any`)
- PostgreSQL + Prisma
- Tailwind CSS
- Better Auth
- Tests : Vitest (règles métier) ; Playwright plus tard pour le pointage
- Fuseau Europe/Paris, locale fr-FR
- UI en français

## Commandes

- Dev : `npm run dev`
- Build : `npm run build`
- Test : `npm test`
- Test ciblé : `npm test -- chemin` (ex. `npm test -- src/server/auth`)
- Lint / types : `npm run lint` et `npx tsc --noEmit`
- Prisma :
  - `npx prisma generate` — régénère le client (pas besoin de base connectée)
  - `npx prisma migrate dev` — applique les migrations en attente sur une base locale
  - `npm run prisma:seed` — rejoue `prisma/seed.ts` (1 admin, 2 agents, 1 client, 1 site, 1 contrat)
- Config Prisma centralisée dans `prisma.config.ts` (Prisma 6.19+, remplace `package.json#prisma`).

## Architecture

Détail complet (arborescence, schéma commenté, ordre des modules) dans
`docs/ARCHITECTURE.md`. Résumé :

- `src/app` — pages (route groups `(auth)`, `(back-office)`, `(agent)`) et route handlers
- `src/server` — actions métier (planning, billing, time, absences), jamais dupliquées entre page et API
- `src/lib` — `auth.ts` (config Better Auth), `prisma.ts` (client singleton), `dates.ts`, `zod/`
- `prisma/schema.prisma` — schéma complet ; `prisma/seed.ts` — seed minimal
- `docs/` — spec figée ; mettre à jour si une règle métier change

Séparer clairement heures contractualisées, heures planifiées, heures réalisées.
Facturation MVP = régie au prévu (heures planifiées du mois × tarif horaire).
Le pointage alimente l’export paie et le contrôle, jamais la facture client
sauf ligne ADHOC saisie par ADMIN.

## Règles dures

- Toute route métier exige une session. Un AGENT ne lit et n’écrit que ses données.
- Pas de secret dans le dépôt. Utiliser `.env`.
- Pas de diagnostic médical. Absence maladie = type + dates + fichier.
- Facture émise : numéro définitif, pas de suppression, correction par avoir.
- Ne pas implémenter de moteur de paie ni de DSN.
- Ne pas appeler d’API de facturation électronique au MVP.
- Valider les entrées (Zod) aux frontières.
- Une fonctionnalité livrée = migration si besoin + tests des règles + UI minimale.
- Commits conventionnels, petits, en français ou en anglais mais cohérents.
- Ne pas exécuter `git push` sans demande explicite.
- Ne pas lancer `git add -A` : stager les fichiers concernés.

## Workflow

1. Mode plan pour tout changement qui touche plus de 3 fichiers ou une règle métier.
2. Citer les fichiers qui seront modifiés.
3. Implémenter uniquement le périmètre demandé.
4. Exécuter les tests concernés et corriger avant de déclarer terminé.
5. Si la spec est ambiguë, poser 3 questions maximum puis proposer une option par défaut.
