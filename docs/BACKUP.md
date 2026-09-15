# Sauvegarde PostgreSQL

**Statut : vérifié le 15/09/2026.** Ce document décrivait jusqu'ici un
`pg_dump`/cron générique qui supposait un Postgres auto-hébergé — la base
réelle est en fait hébergée chez **Supabase** (Postgres managé). Corrigé
ci-dessous pour refléter l'hébergement réel, et une sauvegarde + une
restauration ont été testées de bout en bout ce jour (voir "Vérification
effectuée").

Portée : base Postgres (données métier — 30 tables, dont `User`, `Client`,
`Site`, `Contract`, `Shift`, `Invoice`, `ScannedDocument`...). Les fichiers
uploadés (justificatifs d'absence, photos, scans) sont dans un bucket
Supabase Storage séparé, avec sa propre politique de rétention côté
Supabase — hors de portée d'un `pg_dump`, à vérifier indépendamment
(Storage > bucket `uploads` > paramètres du projet).

## Deux niveaux de sauvegarde

### 1. Sauvegardes natives Supabase (à vérifier dans le tableau de bord)

Supabase peut gérer des sauvegardes automatiques (quotidiennes, et Point-in-
Time Recovery sur les offres payantes) — **à confirmer directement dans le
projet** : Database > Backups. C'est le mécanisme le plus simple, sans
infrastructure supplémentaire à maintenir, mais sa disponibilité et sa
rétention dépendent du plan tarifaire souscrit. Vérifier que la fréquence
et la rétention couvrent bien un scénario réaliste (ex. erreur découverte
plusieurs jours après coup).

### 2. Sauvegarde indépendante par `pg_dump` (filet de sécurité)

Un second mécanisme, indépendant de Supabase et de son plan, à garder
comme filet de sécurité (ex. changement d'hébergeur, litige avec
Supabase, erreur de configuration côté plateforme).

**Piège rencontré en le testant** : `pg_dump` refuse de sauvegarder un
serveur plus récent que sa propre version (`pg_dump: erreur : annulation
à cause de la différence des versions`). Le serveur Supabase de ce projet
tourne en Postgres 17 — la version de `pg_dump` utilisée doit être ≥ 17
(vérifier avec `pg_dump --version` avant de lancer une sauvegarde réelle ;
sur Homebrew, `brew install postgresql@17` si besoin).

```bash
# DIRECT_URL (hors pooler) requise pour pg_dump, comme pour les migrations
# Prisma — voir CLAUDE.md. Format personnalisé (-Fc) : compressé, restaurable
# sélectivement, ne casse pas si le serveur cible a des rôles différents.
pg_dump -Fc --dbname="$DIRECT_URL" -f "/backups/dl_proprete_$(date +%F).dump"

# purge des dumps de plus de 14 jours
find /backups -name 'dl_proprete_*.dump' -mtime +14 -delete
```

Pas de serveur avec accès cron dans cette architecture (hébergement
Vercel, serverless) — deux options pour automatiser ce filet de
sécurité, aucune mise en place pour l'instant :

- Lancer ce `pg_dump` manuellement à intervalle régulier depuis un poste
  ayant accès à `DIRECT_URL` (simple, demande de la discipline).
- Une tâche planifiée externe (ex. GitHub Actions sur un cron, ou un
  petit service dédié) qui exécute la commande ci-dessus et dépose le
  dump dans un stockage externe (pas le même compte Supabase, pour ne pas
  dépendre d'un seul prestataire) — à mettre en place si ce filet de
  sécurité doit devenir automatique.

## Restauration

```bash
pg_restore --clean --if-exists --dbname="$DIRECT_URL" /backups/dl_proprete_YYYY-MM-DD.dump
```

Sur une **vraie restauration d'incident** (pas un test), cette commande
cible un projet Supabase de remplacement avec les mêmes rôles/extensions
déjà en place (`auth`, `storage`, `realtime`...) — jamais un Postgres nu.

## Vérification effectuée (15/09/2026)

- `pg_dump -Fc` contre la base réelle (`DIRECT_URL`) : réussi, dump de
  384 Ko, 759 entrées (schémas internes Supabase + 30 tables métier).
- Restauration testée sur un cluster Postgres local jetable, créé et
  détruit pour l'occasion (jamais contre une base partagée) :
  `pg_restore --no-owner --no-privileges --schema=public` du schéma
  `public` uniquement (les schémas internes Supabase n'ont pas de sens
  hors d'un vrai projet Supabase) — **aucune erreur**.
- Comparaison des lignes restaurées vs la base réelle sur les tables clés
  (`User`, `Client`, `Site`, `Contract`, `Shift`, `Invoice`,
  `ScannedDocument`) : **nombre de lignes identique sur toutes**, dump et
  restauration prouvés fiables de bout en bout.
- Prochaine vérification recommandée : à chaque changement d'hébergeur,
  ou au minimum une fois par an.

## Hébergement

Les dumps (et le projet Supabase lui-même) restent sur un support situé
en France, conformément à `docs/SPEC.md` (hébergement France, données
opérationnelles et comptables) — à confirmer dans les paramètres de
région du projet Supabase si ce n'est pas déjà fait.
