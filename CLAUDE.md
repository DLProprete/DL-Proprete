# DL Propreté — instructions Claude Code

Outil interne pour une entreprise de nettoyage (Calvados) : contrats de sites
sur 12 mois, planning d’agents, pointage mobile, absences, facturation en
régie récurrente au mois. 8 clients et 16 agents au démarrage. Pas d’espace
client. Paie externalisée (export uniquement). Hébergement France.

Lire `docs/SPEC.md` et `docs/DATA-MODEL.md` avant toute conception.
Ne pas inventer de module hors spec.

## Stack imposée

- Next.js App Router, TypeScript strict (`no any`)
- PostgreSQL + Prisma
- Tailwind CSS
- Better Auth
- Tests : Vitest (règles métier) ; Playwright plus tard pour le pointage
- Fuseau Europe/Paris, locale fr-FR
- UI en français

## Commandes

Remplir après initialisation du projet, puis garder à jour :

- Dev : `npm run dev`
- Test : `npm test`
- Test ciblé : `npm test -- chemin`
- Lint / types : `npm run lint` et `npx tsc --noEmit`
- Prisma : `npx prisma migrate dev` et `npx prisma generate`

## Architecture

- `src/app` — pages et route handlers
- `src/server` — actions métier (planning, billing, time, absences)
- `src/lib` — auth, prisma, dates
- `prisma/schema.prisma`
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
