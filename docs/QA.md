# Checklist QA manuelle

À dérouler avant toute mise en production ou après une évolution touchant
plusieurs modules. Comptes de démo : voir `CLAUDE.md`.

## Auth et rôles

- [ ] Connexion ADMIN, PLANNER, AGENT avec les comptes de démo.
- [ ] Mauvais mot de passe → message "Identifiants incorrects.".
- [ ] Aucune route métier accessible sans session (redirection `/login`).
- [ ] Un AGENT ne voit que son propre planning / pointage / absences.
- [ ] Un PLANNER ne voit pas "Paramètres" ni "Tableau de bord" (réservés ADMIN).

## Clients et sites

- [ ] Créer un client, un site rattaché.
- [ ] Désactiver un client/site sans le supprimer physiquement.

## Contrats et vacations types

- [ ] Créer un contrat 12 mois avec une vacation type récurrente.
- [ ] Deux contrats `ACTIVE` qui se chevauchent sur le même site sont refusés.

## Planning

- [ ] Génération des occurrences de `Shift` à partir des vacations types.
- [ ] Un agent ne peut pas être affecté sur deux créneaux qui se chevauchent.
- [ ] Vue jour et vue semaine correctes.

## Pointage

- [ ] Un agent démarre puis termine une vacation (un seul `TimeEntry` ouvert
      à la fois).
- [ ] Validation/rejet d'un pointage par ADMIN ou PLANNER.
- [ ] Un pointage validé n'est plus modifiable par l'agent.

## Absences

- [ ] Déclaration d'un arrêt maladie avec justificatif (PDF ou JPEG).
- [ ] Fichier > 5 Mo refusé.
- [ ] Fichier d'un autre type (ex. `.docx`, `.png`) refusé.
- [ ] Validation ADMIN uniquement (PLANNER n'a pas accès à cette action).
- [ ] Les créneaux planifiés de l'agent absent passent "non pourvus" et un
      remplaçant peut être affecté.

## Facturation

- [ ] Génération des factures du mois à partir des heures planifiées.
- [ ] PDF généré, en-tête = coordonnées saisies dans Paramètres, IBAN affiché
      si renseigné.
- [ ] Une facture émise ne peut pas être supprimée (avoir uniquement).

## Tableau de bord et export

- [ ] Indicateurs à jour : sites non pourvus, pointages ouverts, factures
      impayées, contrats <60 jours.
- [ ] Export CSV des pointages validés du mois.

## Durcissement (session 9)

- [ ] En-têtes de sécurité présents sur les réponses (`X-Frame-Options`,
      `X-Content-Type-Options`, etc. — voir devtools réseau).
- [ ] 6 tentatives de connexion échouées d'affilée → message "Trop de
      tentatives, réessayez plus tard.".
- [ ] Page Paramètres (ADMIN) : modification enregistrée et reflétée dans le
      prochain PDF de facture.
- [ ] `docs/BACKUP.md` à jour et testé (restauration sur une base vide).
