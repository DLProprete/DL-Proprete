# ARCHITECTURE — DL Propreté (v1)

Document de conception issu de la Session 0. Aucune application n'est encore
installée à ce stade. Ce document sert de référence pour la Session 1
(fondation) et les suivantes.

## 0. Décisions prises pour lever les ambiguïtés bloquantes

Trois points structurants pour le schéma / l'architecture ont été tranchés
avant d'écrire ce document :

1. **Facturation** : une facture par contrat (donc par site) et par mois.
   Un client multi-sites reçoit plusieurs factures. Correspond au modèle de
   données fourni (`Invoice.contractId`) sans le faire évoluer.
2. **Authentification** : pas de réinitialisation de mot de passe en
   libre-service au MVP. L'ADMIN régénère un mot de passe temporaire pour un
   utilisateur bloqué. Aucun fournisseur d'e-mail transactionnel à intégrer
   pour l'instant.
3. **Pointage mobile** : web responsive classique pour le MVP, pas de PWA
   (manifest / service worker / mode offline) dès la Session 1. À ajouter
   plus tard si le terrain montre un vrai besoin (coupures réseau
   fréquentes sur chantier).

## 1. Arborescence de dossiers Next.js (App Router)

```
src/
  app/
    (auth)/
      login/page.tsx
    (back-office)/                 # ADMIN + PLANNER — layout vérifie le rôle
      layout.tsx
      dashboard/page.tsx
      clients/
        page.tsx
        new/page.tsx
        [clientId]/page.tsx
      sites/
        [siteId]/page.tsx
      contracts/
        new/page.tsx
        [contractId]/page.tsx      # fiche contrat + vacations (ServiceTemplate)
      planning/
        page.tsx                   # vue semaine par agent / jour par site
      absences/
        page.tsx                   # file de validation + remplacements
      invoices/
        page.tsx
        [invoiceId]/page.tsx
      exports/
        page.tsx                   # export CSV pointages
      settings/
        page.tsx                   # paramètres entreprise (Session 9 uniquement)
    (agent)/                       # AGENT — layout vérifie le rôle
      layout.tsx
      today/page.tsx               # planning du jour + pointage
      week/page.tsx                # planning de la semaine
      absences/
        page.tsx
        new/page.tsx
      hours/page.tsx               # heures pointées du mois en cours
    api/
      auth/[...all]/route.ts       # handler Better Auth
      invoices/[id]/pdf/route.ts   # génération PDF à la volée
      exports/time-entries/route.ts
    layout.tsx
    page.tsx                       # redirection selon rôle de session

  server/                          # actions métier, jamais appelées depuis le client sans passer par ici
    auth/
      session.ts                   # requireSession(), requireRole()
    clients/
      actions.ts
      queries.ts
    sites/
      actions.ts
      queries.ts
    contracts/
      actions.ts
      queries.ts
      overlap.ts                   # règle : pas 2 contrats ACTIVE qui se chevauchent sur un site
    planning/
      generate-shifts.ts           # ServiceTemplate -> Shift, idempotent
      conflicts.ts                 # détection chevauchement agent
      assignments.ts
      queries.ts
    time/
      actions.ts                   # démarrer / terminer / valider / rejeter
      queries.ts
    absences/
      actions.ts
      replacements.ts              # candidats sans conflit sur le créneau
    billing/
      generate-invoices.ts         # génération mensuelle
      numbering.ts                 # séquence F-YYYY-NNNN, transactionnelle
      pdf.ts
      payments.ts
    exports/
      time-entries-csv.ts
    dashboard/
      queries.ts

  lib/
    auth.ts                        # config Better Auth (rôles ADMIN/PLANNER/AGENT)
    prisma.ts                      # client Prisma singleton
    dates.ts                       # helpers Europe/Paris (date-fns-tz)
    uploads.ts                     # écriture/lecture dans uploads/, validation type+taille
    zod/
      client.ts
      contract.ts
      service-template.ts
      shift.ts
      time-entry.ts
      absence.ts
      invoice.ts

  components/
    ui/                             # composants Tailwind partagés (Button, Table, Badge de statut...)

prisma/
  schema.prisma
  migrations/
  seed.ts

uploads/                            # justificatifs absences — gitignored
docs/
```

Principe : les Route Handlers dans `app/api` restent minimaux (auth, PDF,
export — ce qui ne peut pas être une Server Action). Toute la logique métier
vit dans `src/server/**`, appelée depuis des Server Actions ou les Route
Handlers, jamais dupliquée entre page et API.

## 2. Schéma Prisma v1

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  PLANNER
  AGENT
}

enum BillingMode {
  TIME_AND_MATERIALS_PLANNED
}

enum BillingBasis {
  CALENDAR_SHIFTS
  FLAT_INDICATIVE_HOURS
}

enum ContractStatus {
  DRAFT
  ACTIVE
  SUSPENDED
  ENDED
}

enum ShiftStatus {
  PLANNED
  PARTIALLY_STAFFED
  UNSTAFFED
  DONE
  CANCELLED
}

enum AssignmentStatus {
  ASSIGNED
  REPLACED
  CANCELLED
}

enum TimeEntryStatus {
  OPEN
  SUBMITTED
  VALIDATED
  REJECTED
}

enum TimeEntrySource {
  MOBILE
  ADMIN
}

enum AbsenceType {
  PAID_LEAVE
  RTT
  SICK
  OTHER
}

enum AbsenceStatus {
  PENDING
  APPROVED
  REJECTED
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  PARTIALLY_PAID
  PAID
  CANCELLED
}

enum ElectronicStatus {
  NOT_APPLICABLE
}

enum InvoiceLineSource {
  PLANNED_HOURS
  ADHOC
}

enum PaymentMethod {
  TRANSFER
  CHEQUE
  CASH
  OTHER
}

model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  passwordHash        String
  firstName           String
  lastName             String
  phone                String?
  role                 Role
  weeklyContractHours  Decimal?  @db.Decimal(5, 2)
  classification       String?
  isActive             Boolean   @default(true)
  hiredAt              DateTime?
  endedAt              DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  assignments          Assignment[]
  timeEntries          TimeEntry[]
  absences             Absence[]
  validatedTimeEntries TimeEntry[] @relation("TimeEntryValidatedBy")
  auditLogs            AuditLog[]

  @@index([role])
}

model Client {
  id              String    @id @default(cuid())
  legalName       String
  tradeName       String?
  siret           String?
  vatNumber       String?
  billingAddress  String
  email           String?
  phone           String?
  paymentTermDays Int       @default(30)
  notes           String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  sites    Site[]
  contracts Contract[]
  invoices  Invoice[]
}

model Site {
  id                  String   @id @default(cuid())
  clientId            String
  name                String
  address             String
  city                String
  postalCode          String
  accessNotes         String?
  onSiteContactName   String?
  onSiteContactPhone  String?
  surfaceM2           Decimal? @db.Decimal(8, 2)
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  client      Client       @relation(fields: [clientId], references: [id])
  contracts   Contract[]
  shifts      Shift[]
  timeEntries TimeEntry[]

  @@index([clientId])
}

model Contract {
  id                     String         @id @default(cuid())
  clientId               String
  siteId                 String
  reference               String
  startsOn                DateTime       @db.Date
  endsOn                  DateTime       @db.Date
  billingMode             BillingMode    @default(TIME_AND_MATERIALS_PLANNED)
  billingBasis            BillingBasis   @default(CALENDAR_SHIFTS)
  hourlyRateHT             Decimal        @db.Decimal(8, 2)
  indicativeMonthlyHours   Decimal?       @db.Decimal(7, 2)
  vatRate                  Decimal        @default(20) @db.Decimal(4, 2)
  billingDayOfMonth        Int            @default(1)
  status                   ContractStatus @default(DRAFT)
  renewalNoticeDays        Int            @default(60)
  notes                    String?
  createdAt                DateTime       @default(now())
  updatedAt                DateTime       @updatedAt

  client            Client             @relation(fields: [clientId], references: [id])
  site              Site               @relation(fields: [siteId], references: [id])
  serviceTemplates  ServiceTemplate[]
  shifts            Shift[]
  invoices          Invoice[]

  @@index([endsOn, status])
  @@index([siteId, status])
}

model ServiceTemplate {
  id             String   @id @default(cuid())
  contractId     String
  name           String
  daysOfWeek     Int[]
  startTime      DateTime @db.Time
  endTime        DateTime @db.Time
  durationMinutes Int
  requiredAgents  Int      @default(1)
  instructions    String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  contract Contract @relation(fields: [contractId], references: [id])
  shifts   Shift[]

  @@index([contractId])
}

model Shift {
  id                  String      @id @default(cuid())
  serviceTemplateId   String?
  siteId              String
  contractId          String
  date                DateTime    @db.Date
  startAt             DateTime
  endAt               DateTime
  requiredAgents      Int
  status              ShiftStatus @default(UNSTAFFED)
  generatedFromTemplate Boolean   @default(true)
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  serviceTemplate ServiceTemplate? @relation(fields: [serviceTemplateId], references: [id])
  site            Site             @relation(fields: [siteId], references: [id])
  contract        Contract         @relation(fields: [contractId], references: [id])
  assignments     Assignment[]
  timeEntries     TimeEntry[]

  @@index([date, siteId])
  @@index([contractId, date])
  @@unique([serviceTemplateId, date, startAt], name: "uniq_generated_occurrence")
}

model Assignment {
  id                      String           @id @default(cuid())
  shiftId                 String
  userId                  String
  status                  AssignmentStatus @default(ASSIGNED)
  replacedByAssignmentId  String?          @unique
  createdAt               DateTime         @default(now())
  updatedAt               DateTime         @updatedAt

  shift              Shift        @relation(fields: [shiftId], references: [id])
  user               User         @relation(fields: [userId], references: [id])
  replacedByAssignment Assignment? @relation("Replacement", fields: [replacedByAssignmentId], references: [id])
  replacementOf        Assignment[] @relation("Replacement")

  @@index([userId, shiftId])
}

model TimeEntry {
  id                 String           @id @default(cuid())
  userId             String
  siteId             String
  shiftId            String?
  clockInAt          DateTime
  clockOutAt         DateTime?
  status             TimeEntryStatus  @default(OPEN)
  source             TimeEntrySource  @default(MOBILE)
  note               String?
  validatedById      String?
  validatedAt        DateTime?
  payrollExportable  Boolean          @default(true)
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  user        User  @relation(fields: [userId], references: [id])
  site        Site  @relation(fields: [siteId], references: [id])
  shift       Shift? @relation(fields: [shiftId], references: [id])
  validatedBy User?  @relation("TimeEntryValidatedBy", fields: [validatedById], references: [id])

  @@index([userId, clockInAt])
}

model Absence {
  id           String        @id @default(cuid())
  userId       String
  type         AbsenceType
  startsOn     DateTime      @db.Date
  endsOn       DateTime      @db.Date
  status       AbsenceStatus @default(PENDING)
  documentPath String?
  comment      String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId, startsOn])
}

model Invoice {
  id               String            @id @default(cuid())
  clientId         String
  contractId       String?
  number           String?           @unique
  issuedOn         DateTime?         @db.Date
  dueOn            DateTime?         @db.Date
  status           InvoiceStatus     @default(DRAFT)
  electronicStatus ElectronicStatus  @default(NOT_APPLICABLE)
  amountHT         Decimal           @default(0) @db.Decimal(10, 2)
  vatAmount        Decimal           @default(0) @db.Decimal(10, 2)
  amountTTC        Decimal           @default(0) @db.Decimal(10, 2)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  client   Client        @relation(fields: [clientId], references: [id])
  contract Contract?     @relation(fields: [contractId], references: [id])
  lines    InvoiceLine[]
  payments Payment[]

  @@index([status, issuedOn])
}

model InvoiceLine {
  id            String            @id @default(cuid())
  invoiceId     String
  label         String
  quantity      Decimal           @db.Decimal(8, 2)
  unitPriceHT   Decimal           @db.Decimal(10, 2)
  vatRate       Decimal           @db.Decimal(4, 2)
  source        InvoiceLineSource
  hours         Decimal?          @db.Decimal(7, 2)
  createdAt     DateTime          @default(now())

  invoice Invoice @relation(fields: [invoiceId], references: [id])

  @@index([invoiceId])
}

model Payment {
  id        String        @id @default(cuid())
  invoiceId String
  paidOn    DateTime      @db.Date
  amount    Decimal       @db.Decimal(10, 2)
  method    PaymentMethod
  reference String?
  createdAt DateTime      @default(now())

  invoice Invoice @relation(fields: [invoiceId], references: [id])

  @@index([invoiceId])
}

model AuditLog {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  actorUserId String?
  action      String
  entityType  String
  entityId    String
  summary     String
  metadata    Json?

  actor User? @relation(fields: [actorUserId], references: [id])

  @@index([entityType, entityId])
  @@index([createdAt])
  @@index([actorUserId])
  @@index([action])
}

// Utilitaire technique — voir section 3, non présent dans DATA-MODEL.md.
model InvoiceSequence {
  year       Int @id
  lastNumber Int @default(0)
}
```

### Contraintes exprimables uniquement en SQL (pas en Prisma schema)

À ajouter dans la migration générée, en plus de ce que Prisma génère :

- **Unicité `(userId, shiftId)` sur `Assignment` actifs uniquement** (règle
  du modèle de données). Prisma ne sait pas exprimer un index unique
  conditionnel : ajouter un index partiel Postgres dans la migration —
  `CREATE UNIQUE INDEX uniq_active_assignment ON "Assignment" ("shiftId", "userId") WHERE status = 'ASSIGNED';`
- `TimeEntry.clockOutAt > clockInAt` quand renseigné : contrainte `CHECK` en
  SQL, ou validation Zod au minimum. Recommandé : les deux (défense en
  profondeur sur un champ qui alimente la paie).
- `Absence` de type `SICK` : `documentPath` non vide avant passage à
  `APPROVED` — validation applicative dans `server/absences/actions.ts`, pas
  exprimable proprement en contrainte SQL vu la dépendance au statut.

## 3. Écarts par rapport à `docs/DATA-MODEL.md` (et pourquoi)

Le schéma ci-dessus est conforme au modèle fourni. Deux ajouts techniques
ont été faits, tous deux justifiés par une nécessité d'implémentation :

1. **`createdAt` / `updatedAt` sur tous les modèles.** Non listés dans
   `DATA-MODEL.md` sauf pour `AuditLog`, mais nécessaires pour le tri, le
   dashboard, et le débogage. Coût nul, standard Prisma.
2. **`InvoiceSequence`.** Nécessaire pour générer `number` au format
   `F-YYYY-NNNN` sans trou et sans collision en cas de génération concurrente
   (transaction Prisma : lire `lastNumber` pour l'année, incrémenter,
   écrire la facture — le tout dans une seule transaction SQL).
   Séquence **remise à zéro chaque année civile** (hypothèse issue du format
   `F-YYYY-NNNN` du prompt de la Session 7 ; à confirmer si une numérotation
   continue sur plusieurs années est en fait attendue).

Aucun autre champ ni entité n'a été ajouté. `CompanyProfile` /
paramètres entreprise (raison sociale, coordonnées bancaires) **n'est pas
dans le schéma v1** : la Session 7 (prompt) prévoit des mentions légales
codées en dur dans le générateur de PDF, et la Session 9 introduit
explicitement la page de paramètres. Créer la table à ce moment-là plutôt
que maintenant.

**Mise à jour Session 1** — le schéma réellement implémenté
(`prisma/schema.prisma`) diverge du bloc de code ci-dessus sur un point non
anticipé en Session 0 : l'intégration Better Auth.

- `User.passwordHash` a été **retiré**. Better Auth stocke le mot de passe
  hashé du provider `credential` sur `Account.password`, pas sur `User`.
  Dupliquer le hash aurait créé deux sources de vérité.
- `User` gagne trois champs requis par Better Auth : `name` (String, dérivé
  de `firstName`/`lastName` à la création, pas de synchronisation
  automatique en cas de renommage — simplification volontaire de la
  fondation), `emailVerified` (Boolean), `image` (String?, optionnel).
- Trois modèles techniques ajoutés, propres à Better Auth, absents de
  `DATA-MODEL.md` : `Session`, `Account`, `Verification`. Même logique que
  `InvoiceSequence` : infrastructure requise, pas une entité métier.
- `Account.issuer` (String) : découvert après coup en inspectant
  `@better-auth/core/db/schema/account` — Better Auth ne retrouve pas un
  compte par `(providerId, accountId)` mais par `(issuer, accountId)`, où
  `issuer` vaut `local:credential` pour l'auth email+mot de passe. La
  contrainte unique du modèle est donc `@@unique([issuer, accountId])`, pas
  `(providerId, accountId)`. Migration `*_add_account_issuer`.

Voir `src/lib/auth.ts` pour la configuration (rôle exposé via
`user.additionalFields.role`, pas d'inscription libre-service —
`disableSignUp: true`, cohérent avec la décision Session 1 « reset par ADMIN
uniquement »). Comme `signUpEmail` est désactivé, `prisma/seed.ts` insère
`User` + `Account` directement via Prisma, avec `hashPassword` de
`better-auth/crypto` pour produire un hash compatible avec la vérification
de Better Auth au login (`verifyPassword`) — vérifié en Session 1 via
`auth.api.signInEmail`.

## 4. Modules, dans l'ordre d'implémentation

Reprend le découpage de `docs/PROMPTS.md`, formulé en modules techniques.
Un commit par fonctionnalité, tests avant de passer au module suivant.

1. **Fondation** — Next.js + TS strict + Tailwind + Prisma + PostgreSQL +
   Better Auth (ADMIN/PLANNER/AGENT), migration initiale, seed minimal,
   helpers `requireSession`/`requireRole`, helpers dates Europe/Paris.
2. **Clients & Sites** — CRUD, désactivation (pas de suppression physique
   s'il existe un contrat), droits ADMIN/PLANNER vs 403 pour AGENT.
3. **Contrats & vacations types** — CRUD `Contract` + `ServiceTemplate`,
   règle de non-chevauchement de deux contrats `ACTIVE` sur un même site.
4. **Génération de planning** — `ServiceTemplate` → `Shift` (idempotent,
   fenêtre glissante 8 semaines par défaut), affectations avec détection de
   chevauchement horaire agent, vues semaine/jour.
5. **Pointage agent** — démarrer/terminer une vacation, un seul `TimeEntry`
   `OPEN` par agent, validation/rejet par ADMIN ou PLANNER.
6. **Absences & remplacements** — déclaration AGENT, validation **ADMIN
   uniquement** (cf. tableau des rôles SPEC §2 — PLANNER valide les
   pointages, pas les absences), passage des `Assignment` en `REPLACED`,
   recherche de remplaçants sans conflit.
7. **Facturation** — génération mensuelle par contrat actif, ligne
   `PLANNED_HOURS`, numérotation `F-YYYY-NNNN` via `InvoiceSequence`,
   verrouillage à l'émission, PDF avec mentions légales codées en dur,
   saisie de paiement, lignes `ADHOC`.
8. **Tableau de bord & export** — indicateurs (non pourvus, pointages
   ouverts >12h, impayés, contrats <60j), export CSV des `TimeEntry`
   `VALIDATED`.
9. **Durcissement** — rate limit login, headers de sécurité, validation
   type/taille des justificatifs (**voir remarque ci-dessous : à avancer au
   module 6**), sauvegarde Postgres documentée, table `CompanyProfile` et
   page de paramètres entreprise.

**Remarque sur le module 9** : la validation du type/taille de fichier
(5 Mo, PDF/JPEG) pour les justificatifs d'absence est une validation de
frontière (upload utilisateur), pas un durcissement optionnel — à
implémenter dès le module 6 quand l'upload est introduit, pas différée.

## 5. Points de vigilance techniques

- **Dates/heures** : stocker en UTC (comportement par défaut de
  Prisma/Postgres), ne convertir en `Europe/Paris` qu'à l'affichage et dans
  les calculs métier (génération de planning, alertes CCN). Utiliser une
  seule lib de fuseau (`date-fns-tz` ou `Temporal` si dispo) centralisée
  dans `src/lib/dates.ts`.
- **Argent et durées** : toujours `Decimal` (Prisma), jamais `Float`, pour
  éviter les erreurs d'arrondi sur les montants et les heures facturées.
- **Cohérence `Contract.siteId` / `Contract.clientId`** : `Site.clientId`
  doit correspondre à `Contract.clientId`. Non exprimable proprement comme
  contrainte SQL relationnelle simple (contrainte transitive) — à valider
  en Zod/serveur à la création du contrat.
- **Alertes CCN** (repos <11h, >10h/vacation, >35h/semaine, vacation <3h) :
  purement calculées à la volée (planning, pointage), aucun champ persisté
  ajouté au schéma pour ça.
- **`Assignment` actif** : voir contrainte SQL partielle section 2 — à ne
  pas oublier dans la migration, Prisma ne la génère pas seul.

## 6. Ambiguïtés restantes (mineures, non bloquantes)

- Numérotation facture : hypothèse séquence **par année civile** (section 3)
  — à confirmer avant la Session 7.
- `Contract.reference` : format libre non précisé dans la spec — laissé en
  saisie libre ADMIN au MVP, pas de génération automatique.
- `Site.surfaceM2` et `User.classification` : champs informatifs, aucune
  règle métier ne s'appuie dessus au MVP — aucune validation particulière
  prévue au-delà du type.

Rien n'est installé à ce stade. Prochaine étape : Session 1 (fondation),
sur validation de ce document.
