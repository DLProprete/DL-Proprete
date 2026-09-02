# SPEC — Application interne DL Propreté

## 1. Entreprise

- Raison sociale : DL PROPRETE
- Forme : SAS
- SIREN : 531 739 241
- SIRET siège : 531 739 241 00044
- TVA : FR64 531 739 241
- Siège : 3 rue de Verdun, 14460 Colombelles
- APE : 81.22Z — nettoyage des bâtiments et nettoyage industriel
- CCN applicable : IDCC 3043 (entreprises de propreté et services associés)
- Clôture d’exercice : 30 septembre
- RCS : Caen

Objet social : nettoyage industriel, vente de produits d’entretien, manutention,
petit dépannage / maintenance de locaux.

## 2. Utilisateurs et volumétrie de démarrage

- 8 clients au lancement.
- 16 collaborateurs terrain qui pointent eux-mêmes.
- Utilisateurs de l’outil : dirigeant, managers (planning / validation), salariés.

Rôles :

| Rôle | Correspondance | Droits |
|---|---|---|
| ADMIN | Dirigeant | Paramétrage, factures, absences, exports paie, tout le reste. |
| PLANNER | Manager | Clients, sites, contrats, planning, remplacements, validation des pointages. Pas de paramétrage société ni d’annulation de facture émise. |
| AGENT | Salarié | Son planning, pointage entrée/sortie, déclaration d’absence, consultation de ses heures du mois. |

Pas d’espace client. La paie reste chez l’expert-comptable : l’application produit uniquement un export.

## 3. Cœur métier (à ne pas se tromper)

Cadre commercial : **contrats de mission de 12 mois** sur des sites clients.
Mode de facturation : **régie récurrente au mois, au prévu**.

Chaque mois, la facture est calculée à partir des **heures planifiées**
du mois (vacations du cahier des charges, hors annulations), multipliées
par le **tarif horaire HT** du contrat. Le pointage ne modifie pas la
facture client. Des lignes manuelles restent possibles (ponctuel, avoir).

Les heures pointées servent uniquement à contrôler le chantier et à
exporter le temps de travail vers l’expert-comptable.

Trois notions d’heures, jamais fusionnées dans un seul champ :

1. **Heures contractualisées** : volume indicatif au cahier des charges.
2. **Heures planifiées** : créneaux du mois — **seules à entrer dans la facture**.
3. **Heures réalisées** : pointages validés — paie / contrôle uniquement.

## 4. Périmètre MVP

Inclus :

- Fiches clients et sites (chantiers).
- Contrats 12 mois avec reconduction / échéance.
- Prestations récurrentes par site (jours, horaires, durée, nombre d’agents).
- Planning agents × sites, avec détection de conflits.
- Remplacement rapide en cas d’absence.
- Pointage mobile (début / fin de vacation sur un site).
- Absences : congés, RTT, arrêt maladie, autre. Justificatif fichier pour l’arrêt maladie, **sans motif médical**.
- Facturation mensuelle de régie **au prévu** : heures planifiées du mois × tarif horaire du contrat, PDF, suivi des paiements.
- Tableau de bord : sites non pourvus aujourd’hui, pointages manquants, factures impayées, contrats qui expirent sous 60 jours.
- Export CSV des heures pour l’expert-comptable.

Exclus du MVP (phase 2+) :

- Calcul de bulletin de paie, DSN, IJSS, maintien de salaire.
- Facturation électronique via plateforme agréée (prévoir le modèle, ne pas l’implémenter).
- Portail client, contrôle qualité terrain, stocks produits, tournées GPS avancées.
- Annexe 7 / reprise de marché (alerte simple d’échéance suffit au MVP).

**Extension approuvée post-MVP (02/09/2026)** : pipeline commercial
(prospects, avant signature) — `docs/DATA-MODEL.md` §Prospect. Décidé en
dehors du périmètre initial pour construire en interne plutôt que payer un
CRM externe ; ne remplace ni ne modifie le fonctionnement des `Client`
déjà signés.

## 5. Parcours cibles

### 5.1 Créer un contrat

ADMIN saisit le client, le ou les sites, la période (12 mois), le tarif
horaire HT de régie, le volume horaire mensuel indicatif, le taux de TVA,
la date de facturation (ex. le 1er du mois suivant), puis les vacations
récurrentes :

- site ;
- jours de la semaine ;
- fenêtre horaire (ex. 06:00–08:00) ;
- durée estimée ;
- nombre d’agents requis ;
- consignes / cahier des charges (texte).

Le système génère automatiquement les occurrences de planning sur la période
du contrat. ADMIN affecte ensuite les agents.

### 5.2 Semaine type d’un agent

L’agent ouvre l’application le matin, voit ses sites du jour, démarre le
pointage à l’arrivée, le termine à la sortie. Si plusieurs sites dans la
journée : un pointage par vacation / site.

### 5.3 Arrêt maladie

L’agent déclare l’absence (dates + pièce jointe). ADMIN valide.
Les créneaux planifiés sur la période passent « non pourvus ».
ADMIN affecte un remplaçant. La facture client **ne change pas** : elle
reste calée sur le prévu. Le pointage du remplaçant sert à l’export paie
et au contrôle du chantier.

### 5.4 Facture mensuelle

Chaque mois, ADMIN lance « générer les factures du mois ». Pour chaque
contrat actif :

- sommer les **heures d'agent** des Shift du mois liés au contrat, hors statut
  CANCELLED : pour chaque vacation, `billableMinutes × requiredAgents`. On vend
  des heures de main-d'œuvre, pas des créneaux — une vacation d'1 h 30 à deux
  agents représente 3 h facturables ;
- créer une ligne de régie : quantité = heures prévues, PU = tarif horaire HT ;
- refuser d'émettre en silence une facture manifestement incomplète : si le mois
  n'est pas planifié jusqu'au bout, ou si le total s'écarte de plus de 10 % de
  `indicativeMonthlyHours`, le brouillon est créé mais l'écran signale l'anomalie ;
- afficher en contrôle (non facturé) les heures pointées validées du même mois ;
- numéro séquentiel, PDF, brouillon puis émise ;
- saisie manuelle d’un règlement ensuite.

**Décision du 31/08/2026** : le défaut est le forfait mensuel lissé
(`billingBasis: FLAT_INDICATIVE_HOURS`, quantité = `indicativeMonthlyHours`).
La pratique du secteur est un montant identique chaque mois, 1/12e du volume
annuel ; un montant qui bouge tous les mois se fait contester tous les mois.
`CALENDAR_SHIFTS` reste disponible contrat par contrat pour qui veut facturer
le calendrier réel — un février plus court ou un mois à cinq lundis fait alors
varier le montant, et c'est assumé.

**Amplitude ≠ durée vendue.** `ServiceTemplate.startTime`/`endTime` décrivent la
fenêtre pendant laquelle l'agent peut accéder au site ; `durationMinutes` est la
durée de prestation réellement vendue. « Passage entre 6 h et 8 h, 1 h 30 de
prestation » est un cas courant. Seule `durationMinutes` part en facture, et
elle ne peut pas dépasser la fenêtre. Chaque Shift fige cette durée à la
génération (`Shift.billableMinutes`) : modifier un contrat ne doit jamais
changer rétroactivement une période déjà facturée.

Les prestations ponctuelles (remise en état, dépannage) sont une ligne
ADHOC, ajoutable à la facture du mois ou facturée isolément.

## 6. Règles métier

- Un agent ne peut pas être planifié sur deux sites qui se chevauchent.
- Alerte si le nombre d’agents planifiés sur une vacation < nombre requis.
- Un pointage doit être rattaché à une vacation planifiée du jour, ou créé
  comme « hors planning » (visible pour ADMIN).
- Un pointage validé n’est plus modifiable par l’agent.
- Numérotation des factures : préfixe + année + séquence, sans trou une fois
  le statut « émise ». Avoir pour corriger.
- Données d’absence maladie : type, dates, fichier, statut. Jamais de
  diagnostic ou de texte médical libre.
- Tous les accès API exigent une session authentifiée.
- Un AGENT ne voit que ses propres données.
- Conservation des pointages et factures : durée légale comptable (10 ans
  pour les pièces), à paramétrer plus tard ; au MVP, pas de purge automatique.

## 7. Contraintes CCN (alertes, pas de moteur de paie)

L’application n’applique pas la paie. Elle **signale** :

- vacation planifiée > 10 h de travail effectif ;
- repos < 11 h entre deux vacations ;
- dépassement indicatif de 35 h / semaine pour un temps plein
  (le contrat de travail de l’agent porte la durée hebdomadaire de référence) ;
- vacation isolée < 3 h (alerte « temps partiel éclaté » à confirmer selon
  l’organisation réelle).

Ces alertes sont informatives. Elles n’empêchent pas l’enregistrement.

## 8. Conformité

- RGPD : base légale exécution du contrat de travail et intérêt légitime
  d’organisation. Minimisation. Droit d’accès via ADMIN.
- Factures : mentions légales obligatoires entre professionnels
  (https://entreprendre.service-public.gouv.fr/vosdroits/F31808), implémentées
  dans `server/billing/legal-mentions.ts` et testées :
  identification du vendeur (raison sociale, forme juridique, capital social,
  RCS + SIREN, SIRET, TVA intracommunautaire, adresse) ; identification du
  client, **TVA intracommunautaire du preneur comprise** ; numéro et date de
  facture ; période d'exécution de la prestation ; détail HT/TVA/TTC ; délai
  de règlement ; **taux des pénalités de retard** dues de plein droit ;
  **indemnité forfaitaire de 40 €** pour frais de recouvrement (art. L441-10
  du code de commerce) ; mention de l'absence d'escompte ; IBAN de règlement.
  L'écran Paramètres et la facture en brouillon signalent ce qui manque —
  le contrôle a lieu avant émission, une facture émise ne se corrigeant que
  par un avoir.
- Réforme facturation électronique : réception obligatoire depuis le
  1er septembre 2026 via une plateforme agréée ; émission PME au
  1er septembre 2027. Le MVP produit un PDF classique. Prévoir un
  champ `electronicStatus` pour plus tard.
- Hébergement : France uniquement (données opérationnelles et comptables).
  Les justificatifs papier (arrêts, contrats signés) restent l’original
  juridique ; l’application en conserve une copie numérique.

## 9. Exigences techniques

- Application web responsive (le pointage se fait sur le téléphone).
- PWA acceptée ; application native hors MVP.
- Authentification e-mail + mot de passe, plus code à 6 chiffres optionnel
  plus tard.
- Fuseau : Europe/Paris.
- Langue : français uniquement.
- Stack imposée pour limiter les choix de Claude :
  Next.js (App Router) + TypeScript strict + PostgreSQL + Prisma +
  Tailwind + Better Auth + stockage fichiers local (dossier `uploads/`)
  au MVP, remplaçable par S3 compatible ensuite.
- Tests unitaires des règles (conflits planning, génération facture,
  droits AGENT).
- Un seed de démonstration : 2 clients, 3 sites, 3 agents, 1 contrat,
  une semaine de planning.

## 10. Critères d’acceptation du MVP

- Un ADMIN peut créer client → site → contrat 12 mois → vacations → affectations.
- Un AGENT voit uniquement son planning du jour / de la semaine et pointe.
- Un arrêt maladie retire l’agent du planning et crée des vacations non pourvues.
- Les factures du mois se génèrent à partir des heures planifiées × tarif du contrat, en PDF.
- Un export CSV des pointages validés du mois est téléchargeable.
- Aucune route métier n’est accessible sans authentification.
