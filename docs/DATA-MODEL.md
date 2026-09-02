# Modèle de données — DL Propreté

Cible Prisma / PostgreSQL. Les noms d’entités restent en anglais dans le code
(convention technique). Les libellés UI sont en français.

## Entités

### User
- id, email, passwordHash, firstName, lastName, phone
- role: ADMIN | PLANNER | AGENT
- weeklyContractHours (Decimal, durée contractuelle indicative)
- classification (texte libre CCN, ex. "AS1") — informatif
- isActive
- hiredAt, endedAt

### Prospect
*Ajouté le 02/09/2026, extension approuvée du périmètre MVP — pipeline
commercial (voir `docs/SPEC.md`).*
- id, legalName, contactName, phone, email, address, source, notes
- status: NEW | CONTACTED | QUOTE_SENT | WON | LOST (défaut NEW)
- nextFollowUpAt (date de relance, optionnel)
- convertedClientId — référence libre vers `Client` (pas de `@relation`,
  même convention qu'`AuditLog.entityId`), renseigné uniquement par la
  conversion (voir ci-dessous)
- Statut WON jamais choisi à la main : uniquement via la conversion en
  client, qui crée un `Client` indépendant et fixe `convertedClientId`.

### Client
- id, legalName, tradeName, siret, vatNumber
- billingAddress, email, phone
- paymentTermDays (défaut 30)
- notes
- isActive

### ClientPortalToken / ClientPortalSession
*Ajouté le 02/09/2026, extension approuvée du périmètre MVP — espace
client par lien magique (voir `docs/SPEC.md`).* Volontairement
indépendant du système d'authentification interne (`User`/Better Auth) :
aucune table ni cookie partagé, séparation garantie par construction.
- `ClientPortalToken` : clientId (référence libre), tokenHash (jamais le
  token brut), expiresAt (15 min), usedAt (usage unique)
- `ClientPortalSession` : clientId (référence libre), expiresAt (30 jours)
- Déclenché uniquement par un ADMIN/PLANNER depuis la fiche client —
  aucun formulaire public de connexion, aucun risque d'énumération
  d'adresses e-mail.

### Site
- id, clientId
- name, address, city, postalCode
- accessNotes (digicode, consignes d’accès — pas de données santé)
- onSiteContactName, onSiteContactPhone
- surfaceM2 (optionnel)
- isActive

### Contract
- id, clientId, siteId (un contrat = un site au MVP ; un client multi-sites
  a plusieurs contrats)
- reference
- startsOn, endsOn
- billingMode: TIME_AND_MATERIALS_PLANNED (régie au prévu)
- billingBasis: CALENDAR_SHIFTS | FLAT_INDICATIVE_HOURS
  (défaut FLAT_INDICATIVE_HOURS depuis le 31/08/2026 = forfait mensuel lissé.
  CALENDAR_SHIFTS = somme des heures d'agent des vacations du mois hors
  CANCELLED, soit Σ billableMinutes × requiredAgents)
- hourlyRateHT (Decimal)
- indicativeMonthlyHours (Decimal) — si FLAT_INDICATIVE_HOURS ; sinon référentiel d’écart
- vatRate (Decimal, défaut 20)
- billingDayOfMonth (1–28)
- status: DRAFT | ACTIVE | SUSPENDED | ENDED
- renewalNoticeDays (défaut 60)
- notes

### ServiceTemplate (vacation type du contrat)
- id, contractId
- name (ex. "Entretien quotidien bureaux")
- daysOfWeek: Int[] (1=lundi … 7=dimanche)
- startTime, endTime (Time) — fenêtre d'accès au site, pas la durée vendue
- durationMinutes — durée de prestation vendue, ≤ (endTime − startTime).
  C'est elle qui part en facture, jamais la fenêtre.
- requiredAgents — multiplie la durée vendue dans le calcul de la facture
- instructions
- isActive

### Shift (occurrence planifiée)
- id, serviceTemplateId, siteId, contractId
- billableMinutes — durée vendue, recopiée du ServiceTemplate à la génération
  et figée : une modification ultérieure du contrat ne doit pas changer
  rétroactivement une période déjà facturée
- date, startAt, endAt
- requiredAgents
- status: PLANNED | PARTIALLY_STAFFED | UNSTAFFED | DONE | CANCELLED
- generatedFromTemplate (Boolean)

### Assignment
- id, shiftId, userId
- status: ASSIGNED | REPLACED | CANCELLED
- replacedByAssignmentId (nullable)

### TimeEntry
- id, userId, siteId, shiftId (nullable si hors planning)
- clockInAt, clockOutAt
- status: OPEN | SUBMITTED | VALIDATED | REJECTED
- source: MOBILE | ADMIN
- note (court, opérationnel)
- validatedById, validatedAt
- payrollExportable (Boolean, défaut true)
- Le pointage n’est pas la source de la facture client.

### Absence
- id, userId
- type: PAID_LEAVE | RTT | SICK | OTHER
- startsOn, endsOn
- status: PENDING | APPROVED | REJECTED
- documentPath (obligatoire si SICK, après validation ADMIN peut exiger)
- comment (organisation uniquement ; interdit d’y saisir un diagnostic)

### Invoice
- id, clientId, contractId (nullable si facture ponctuelle hors contrat)
- number (unique)
- issuedOn, dueOn
- status: DRAFT | ISSUED | PARTIALLY_PAID | PAID | CANCELLED
- electronicStatus: NOT_APPLICABLE (réservé réforme 2027)
- amountHT, vatAmount, amountTTC

### InvoiceLine
- id, invoiceId
- label, quantity, unitPriceHT, vatRate
- source: PLANNED_HOURS | ADHOC
- hours (Decimal, si régie au prévu)

### Payment
- id, invoiceId
- paidOn, amount, method: TRANSFER | CHEQUE | CASH | OTHER
- reference

### AuditLog
- id, createdAt, actorUserId, action, entityType, entityId
- summary (texte court, lisible humainement)
- metadata (JSON optionnel)
- Jamais de mot de passe ni de contenu de justificatif dans summary/metadata.
- Aucune suppression (règle dure) ; ADMIN uniquement en lecture (page `/audit`).

## Règles d’intégrité

- Unique (userId, shiftId) sur Assignment actifs.
- Invoice.number unique.
- TimeEntry.clockOutAt > clockInAt quand renseigné.
- Absence SICK : documentPath non vide avant passage APPROVED
  (ou au plus tard à la validation ADMIN).
- Soft-delete interdit sur Invoice émise ; statut CANCELLED + avoir.

## Index utiles

- Shift(date, siteId)
- Assignment(userId, shiftId)
- TimeEntry(userId, clockInAt)
- Contract(endsOn, status)
- Invoice(status, issuedOn)
