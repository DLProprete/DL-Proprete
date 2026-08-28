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

### Client
- id, legalName, tradeName, siret, vatNumber
- billingAddress, email, phone
- paymentTermDays (défaut 30)
- notes
- isActive

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
  (défaut CALENDAR_SHIFTS = somme des vacations du mois hors CANCELLED)
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
- startTime, endTime (Time)
- durationMinutes
- requiredAgents
- instructions
- isActive

### Shift (occurrence planifiée)
- id, serviceTemplateId, siteId, contractId
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
- id, actorId, action, entity, entityId, createdAt, payload (JSON)

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
