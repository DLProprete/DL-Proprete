# DL Propreté — dossier de cadrage pour Claude Code

Ce dossier sert de point de départ pour développer l’outil interne de gestion
(contrats de sites, planning agents, pointage, absences, facturation mensuelle).

## Contenu

| Fichier | Usage |
|---|---|
| `docs/SPEC.md` | Cahier des charges métier. À faire lire à Claude en premier. |
| `docs/DATA-MODEL.md` | Modèle de données cible (Prisma). |
| `CLAUDE.md` | Instructions permanentes pour Claude Code. À placer à la racine du futur dépôt. |
| `docs/PROMPTS.md` | Prompts session par session. |

## Ordre de travail recommandé

1. Créer un dépôt Git vide.
2. Copier `CLAUDE.md` et le dossier `docs/` dans ce dépôt.
3. Installer Claude Code, ouvrir le dépôt, lancer `/init` puis ajuster le `CLAUDE.md` généré avec celui fourni ici.
4. Démarrer en **mode plan** avec le prompt « Session 0 » de `docs/PROMPTS.md`.
5. Avancer module par module. Un commit Git par fonctionnalité.

Ne pas demander à Claude Code de générer l’application entière en une session.
