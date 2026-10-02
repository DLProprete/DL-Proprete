# Durées de conservation et purge automatique

Le RGPD (art. 5.1.e) interdit de garder des données personnelles plus
longtemps que nécessaire. L'outil supprime chaque nuit ce qui a dépassé sa
durée de conservation. Règles et valeurs par défaut :
`src/server/retention/rules.ts`. Moteur : `src/server/retention/purge.ts`.
Réglage par l'admin : page Paramètres, section « Durées de conservation ».

Ces durées sont proposées par défaut. **Elles doivent être validées par DL
Propreté**, responsable du traitement, et reportées dans son registre des
traitements.

## Règles

| Règle | Défaut | Minimum | Supprimé | Source |
|---|---|---|---|---|
| Justificatifs d'absence (fichier) | 12 mois après la fin de l'absence | 1 | le fichier (l'absence reste) | finalité : contrôle de l'absence ; donnée possiblement de santé, à garder le moins longtemps possible |
| Absences (type, dates) | 36 mois après la fin | 12 | la ligne | prescription des salaires, C. trav. L3245-1 |
| Planning nominatif et pointages | 36 mois | 12 | pointages et affectations (la vacation reste, sans nom) | minimum C. trav. D3171-16 (1 an) ; 3 ans, comme les horodatages du contrat RGPD (art. 1.3) |
| Photos de main courante | 12 mois | 1 | la photo (le texte reste) | aucune règle propre : durée nécessaire à la finalité (RGPD art. 5.1.e) |
| Main courante (texte) et points agents | 36 mois | 1 | les entrées | idem |
| Prospects non convertis et leurs devis | 36 mois après le dernier contact | 1 | prospect et ses devis ; jamais un prospect devenu client ni un devis signé | CNIL, référentiel gestion commerciale (délibération 2021-131) |
| Journal d'activité (qui a fait quoi) | 60 mois | 12 | les lignes métier (validations, factures, signatures…) | historique métier : prescription commerciale 5 ans (C. com. L110-4) |
| Journal des erreurs serveur | 12 mois | 6 | les lignes « Erreur serveur » | CNIL, recommandation journalisation (délibération 2021-122) : 6 mois à 1 an |
| Sessions et liens d'accès expirés | 30 jours après expiration | fixe | sessions, jetons du portail client | technique |

**Jamais purgé automatiquement :**
- factures émises : 10 ans (C. com. L123-22), et pas de suppression d'une
  facture émise ;
- clients, sites, contrats ;
- archives numérisées (décision du 02/10/2026 : contrats papier depuis 2011
  conservés pour la recherche) ;
- comptes salariés : leur anonymisation 5 ans après le départ reste à
  prévoir, la première échéance tombe en 2031.

Points à reconfirmer : le référentiel CNIL « gestion du personnel » a été
renouvelé en 2026 (délibération 2026-031). Il faut en vérifier le tableau
pour les durées RH.

## Fonctionnement

- Les fichiers sont supprimés **avant** que la ligne qui les référence soit
  vidée ou supprimée. Si un fichier ne peut pas être supprimé, la ligne
  reste et sera reprise au passage suivant. Le bilan signale l'échec ; il
  n'y a jamais de fichier orphelin.
- Chaque passage écrit un bilan dans le journal d'audit (« Purge de
  conservation »). Chaque changement de durée y est aussi tracé
  (« Durées de conservation modifiées »). Ces deux types de lignes ne sont
  jamais purgés : ils prouvent ce qui a été effacé et selon quelles durées
  (RGPD art. 5.2).
- Le fichier d'une ligne part au plus tard en même temps que la ligne,
  même si sa propre durée est réglée plus longue.
- Pas de durée à 0 ni de champ vide : minimum 1 mois. Une faute de frappe
  reste possible (3 au lieu de 36) : la page affiche le nombre d'éléments
  du prochain passage, à vérifier après chaque modification.
- La page Paramètres affiche ce qui partira au prochain passage et propose
  « Lancer la purge maintenant ».

## Déclenchement

Route `GET /api/cron/retention`, protégée par l'en-tête
`Authorization: Bearer <CRON_SECRET>`. Sans `CRON_SECRET`, elle refuse tout.

- **Vercel** : `vercel.json` déclare un cron quotidien à 03:00 UTC. Vercel
  envoie lui-même l'en-tête dès que la variable `CRON_SECRET` est définie
  dans le projet.
- **VPS** : une ligne de crontab, à adapter au domaine :
  ```
  0 3 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/retention > /dev/null
  ```
