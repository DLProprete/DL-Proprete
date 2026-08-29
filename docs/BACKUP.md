# Sauvegarde PostgreSQL

Portée : base `dl_proprete` (données métier). Les fichiers d'upload
(`uploads/`, justificatifs d'absence) sont sauvegardés séparément par une
copie de dossier sur le même support, à la même fréquence.

## Fréquence et rétention

- Sauvegarde quotidienne, via cron sur l'hébergeur (France).
- Rétention : 14 jours glissants. Purge automatique des dumps plus anciens.

## Commande de sauvegarde

```bash
pg_dump -Fc --dbname="$DATABASE_URL" -f "/backups/dl_proprete_$(date +%F).dump"

# purge des dumps de plus de 14 jours
find /backups -name 'dl_proprete_*.dump' -mtime +14 -delete
```

À planifier via `crontab` (ex. tous les jours à 3h locale, Europe/Paris) :

```cron
0 3 * * * /usr/local/bin/dl-proprete-backup.sh
```

## Restauration

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" /backups/dl_proprete_YYYY-MM-DD.dump
```

Tester la restauration sur une base vide avant tout incident réel (au
minimum une fois après la mise en place, puis lors de chaque changement
d'hébergeur).

## Hébergement

Les dumps restent sur un support situé en France, conformément à
`docs/SPEC.md` (hébergement France, données opérationnelles et comptables).
