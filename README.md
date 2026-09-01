# DL Propreté

Outil interne de gestion pour une entreprise de nettoyage professionnel
(Calvados) : contrats de sites, planning d'agents, pointage mobile,
absences, facturation en régie récurrente au mois. 8 clients et 16 agents
au démarrage. Pas d'espace client, paie externalisée (export uniquement).

## Stack

- Next.js App Router, TypeScript strict
- PostgreSQL + Prisma
- Tailwind CSS
- Better Auth
- Tests : Vitest

## Démarrage rapide

Créer un `.env` local (non commité) :

```
DATABASE_URL="postgresql://user:password@localhost:5432/dlproprete?schema=public"
BETTER_AUTH_SECRET="une valeur aléatoire longue"
BETTER_AUTH_URL="http://localhost:3000"
```

Puis :

```bash
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

L'app tourne sur `http://localhost:3000`.

## Scripts

| Commande | Usage |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et lancement production |
| `npm test` | Suite de tests Vitest |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Vérification des types |
| `npm run prisma:migrate` | Applique les migrations en attente |
| `npm run prisma:generate` | Régénère le client Prisma |
| `npm run prisma:seed` | Rejoue `prisma/seed.ts` (1 admin, 2 agents, 1 client, 1 site, 1 contrat) |

## Documentation

| Fichier | Contenu |
|---|---|
| `CLAUDE.md` | Instructions permanentes pour Claude Code — à lire en premier |
| `docs/SPEC.md` | Cahier des charges métier |
| `docs/DATA-MODEL.md` | Modèle de données (Prisma) |
| `docs/ARCHITECTURE.md` | Arborescence, schéma commenté, ordre des modules |
| `docs/DESIGN.md` | Système de design (composants, couleurs, philosophie visuelle) |
| `docs/AUDIT-2026-08-31.md` | Audit du 31/08/2026 et son suivi |
| `docs/QA.md` | Notes de vérification manuelle |
| `docs/PROMPTS.md` | Historique des prompts de session |
| `docs/BACKUP.md` | Procédure de sauvegarde |

## État actuel

Fonctionnellement complet sur les quatre domaines back-office (Exploitation,
Commercial, RH, Pilotage) et l'écran agent (pointage mobile). Suite de tests
verte, design cohérent sur l'ensemble de l'outil.

Deux décisions restent hors du code, à trancher avec les parties prenantes
avant d'y toucher : le modèle contrat par site vs. contrat-cadre multi-sites,
et le choix de plateforme pour la facturation électronique obligatoire
(échéance d'émission : septembre 2027).

## Identifiants de démo

`admin@dlproprete.fr`, `agent1@dlproprete.fr`, `agent2@dlproprete.fr` — mot
de passe `changeme123` pour les trois. **À changer avant tout déploiement
au-delà du poste local.**
