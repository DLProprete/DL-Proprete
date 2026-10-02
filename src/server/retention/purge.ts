import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteUpload } from "@/lib/uploads";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import {
  EXPIRED_ACCESS_GRACE_DAYS,
  KEPT_AUDIT_ACTIONS,
  RETENTION_MAX_MONTHS,
  RETENTION_RULES,
  type RetentionKey,
  type RetentionMonths,
} from "./rules";

export async function getRetentionMonths(): Promise<RetentionMonths> {
  const saved = await prisma.retentionSetting.findMany();
  const entries = RETENTION_RULES.map((rule) => {
    const months = saved.find((row) => row.key === rule.key)?.months ?? rule.defaultMonths;
    // Garde-fou si une valeur hors bornes a été écrite en base par un autre chemin.
    return [rule.key, Math.min(RETENTION_MAX_MONTHS, Math.max(rule.minMonths, months))];
  });
  return Object.fromEntries(entries) as RetentionMonths;
}

// Même jour du mois N mois plus tôt, ramené au dernier jour du mois visé :
// sans ça, 29/02 − 12 mois donnerait le 01/03, un jour sous le minimum légal.
export function monthsBefore(now: Date, months: number): Date {
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(now.getUTCDate(), lastDay));
  target.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
  return target;
}

// Mêmes critères pour l'aperçu et la purge. Une ligne qui référence encore un
// fichier n'est jamais supprimée : le fichier part d'abord (règle « fichier »),
// sinon il deviendrait orphelin dans le stockage. Le fichier part donc au plus
// tard quand sa ligne arrive à échéance, même si sa propre durée est plus longue.
function criteria(months: RetentionMonths, now: Date) {
  const cutoff = (key: RetentionKey, cap?: RetentionKey) =>
    monthsBefore(now, cap ? Math.min(months[key], months[cap]) : months[key]);
  const expired = new Date(now.getTime() - EXPIRED_ACCESS_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const prospectCutoff = cutoff("prospects");
  return {
    absenceDocuments: { documentPath: { not: null }, endsOn: { lt: cutoff("absenceDocuments", "absences") } },
    absences: { documentPath: null, endsOn: { lt: cutoff("absences") } },
    timeEntries: { clockInAt: { lt: cutoff("timeTracking") } },
    assignments: { shift: { date: { lt: cutoff("timeTracking") } } },
    siteLogPhotos: { photoPath: { not: null }, createdAt: { lt: cutoff("siteLogPhotos", "siteLogs") } },
    siteLogs: { photoPath: null, createdAt: { lt: cutoff("siteLogs") } },
    checkIns: { occurredOn: { lt: cutoff("siteLogs") } },
    // Un prospect devenu client, ou dont un devis a donné un contrat, n'est jamais purgé.
    prospects: {
      updatedAt: { lt: prospectCutoff },
      convertedClientId: null,
      quotes: { none: { OR: [{ updatedAt: { gte: prospectCutoff } }, { contractId: { not: null } }] } },
    },
    activityLogs: {
      createdAt: { lt: cutoff("activityLogs") },
      action: { notIn: ["SERVER_ERROR", ...KEPT_AUDIT_ACTIONS] },
    },
    errorLogs: { action: "SERVER_ERROR", createdAt: { lt: cutoff("errorLogs") } },
    expired: { expiresAt: { lt: expired } },
  } satisfies {
    absenceDocuments: Prisma.AbsenceWhereInput;
    absences: Prisma.AbsenceWhereInput;
    timeEntries: Prisma.TimeEntryWhereInput;
    assignments: Prisma.AssignmentWhereInput;
    siteLogPhotos: Prisma.SiteLogWhereInput;
    siteLogs: Prisma.SiteLogWhereInput;
    checkIns: Prisma.AgentSiteCheckInWhereInput;
    prospects: Prisma.ProspectWhereInput;
    activityLogs: Prisma.AuditLogWhereInput;
    errorLogs: Prisma.AuditLogWhereInput;
    expired: Prisma.SessionWhereInput;
  };
}

export type PurgeCounts = {
  absenceDocuments: number;
  absences: number;
  timeEntries: number;
  assignments: number;
  siteLogPhotos: number;
  siteLogs: number;
  checkIns: number;
  prospects: number;
  activityLogs: number;
  errorLogs: number;
  expiredAccess: number;
};

export async function previewPurge(now = new Date()): Promise<PurgeCounts> {
  const where = criteria(await getRetentionMonths(), now);
  const [absenceDocuments, absences, timeEntries, assignments, siteLogPhotos, siteLogs, checkIns, prospects, activityLogs, errorLogs, sessions, tokens, portalSessions] =
    await Promise.all([
      prisma.absence.count({ where: where.absenceDocuments }),
      // Lignes échues, y compris celles dont le fichier part dans le même passage.
      prisma.absence.count({ where: { endsOn: where.absences.endsOn } }),
      prisma.timeEntry.count({ where: where.timeEntries }),
      prisma.assignment.count({ where: where.assignments }),
      prisma.siteLog.count({ where: where.siteLogPhotos }),
      prisma.siteLog.count({ where: { createdAt: where.siteLogs.createdAt } }),
      prisma.agentSiteCheckIn.count({ where: where.checkIns }),
      prisma.prospect.count({ where: where.prospects }),
      prisma.auditLog.count({ where: where.activityLogs }),
      prisma.auditLog.count({ where: where.errorLogs }),
      prisma.session.count({ where: where.expired }),
      prisma.clientPortalToken.count({ where: where.expired }),
      prisma.clientPortalSession.count({ where: where.expired }),
    ]);
  return {
    absenceDocuments, absences, timeEntries, assignments, siteLogPhotos, siteLogs, checkIns, prospects, activityLogs, errorLogs,
    expiredAccess: sessions + tokens + portalSessions,
  };
}

const FILE_BATCH = 200;

// Fichier d'abord, puis le chemin est vidé. Un fichier impossible à supprimer
// laisse sa ligne intacte : elle sera reprise au passage suivant.
async function purgeFiles(
  find: (skip: string[]) => Promise<{ id: string; path: string | null }[]>,
  clear: (id: string) => Promise<unknown>,
): Promise<{ deleted: number; failed: number }> {
  const failed: string[] = [];
  let deleted = 0;
  for (;;) {
    const batch = await find(failed);
    if (batch.length === 0) return { deleted, failed: failed.length };
    for (const row of batch) {
      try {
        if (row.path) await deleteUpload(row.path);
        await clear(row.id);
        deleted++;
      } catch (error) {
        console.error(`[conservation] fichier non supprimé (${row.id}) :`, error);
        failed.push(row.id);
      }
    }
  }
}

export type PurgeReport = PurgeCounts & { fileErrors: number };

// `actor` : l'admin qui lance à la main ; absent pour la tâche de nuit.
export async function runPurge(now = new Date(), actor?: SessionUser): Promise<PurgeReport> {
  if (actor) requireRole(actor, ["ADMIN"]);
  const where = criteria(await getRetentionMonths(), now);

  const documents = await purgeFiles(
    async (skip) =>
      (
        await prisma.absence.findMany({
          where: { ...where.absenceDocuments, id: { notIn: skip } },
          select: { id: true, documentPath: true },
          take: FILE_BATCH,
        })
      ).map((row) => ({ id: row.id, path: row.documentPath })),
    (id) => prisma.absence.update({ where: { id }, data: { documentPath: null } }),
  );
  const photos = await purgeFiles(
    async (skip) =>
      (
        await prisma.siteLog.findMany({
          where: { ...where.siteLogPhotos, id: { notIn: skip } },
          select: { id: true, photoPath: true },
          take: FILE_BATCH,
        })
      ).map((row) => ({ id: row.id, path: row.photoPath })),
    (id) => prisma.siteLog.update({ where: { id }, data: { photoPath: null } }),
  );

  // Pas de transaction : chaque suppression est indépendante et rejouable, et
  // une transaction longue (premier passage volumineux) expirerait à chaque fois.
  const prospectIds = (await prisma.prospect.findMany({ where: where.prospects, select: { id: true } })).map((p) => p.id);
  await prisma.quote.deleteMany({ where: { prospectId: { in: prospectIds } } }); // lignes de devis en cascade
  const rows = {
    absences: (await prisma.absence.deleteMany({ where: where.absences })).count,
    timeEntries: (await prisma.timeEntry.deleteMany({ where: where.timeEntries })).count,
    assignments: (await prisma.assignment.deleteMany({ where: where.assignments })).count,
    siteLogs: (await prisma.siteLog.deleteMany({ where: where.siteLogs })).count,
    checkIns: (await prisma.agentSiteCheckIn.deleteMany({ where: where.checkIns })).count,
    prospects: (await prisma.prospect.deleteMany({ where: { id: { in: prospectIds } } })).count,
    activityLogs: (await prisma.auditLog.deleteMany({ where: where.activityLogs })).count,
    errorLogs: (await prisma.auditLog.deleteMany({ where: where.errorLogs })).count,
    expiredAccess:
      (await prisma.session.deleteMany({ where: where.expired })).count +
      (await prisma.clientPortalToken.deleteMany({ where: where.expired })).count +
      (await prisma.clientPortalSession.deleteMany({ where: where.expired })).count,
  };

  const report: PurgeReport = {
    absenceDocuments: documents.deleted,
    siteLogPhotos: photos.deleted,
    ...rows,
    fileErrors: documents.failed + photos.failed,
  };
  const total = Object.entries(report).reduce((sum, [key, value]) => (key === "fileErrors" ? sum : sum + value), 0);
  // Écrit après la purge du journal : le bilan du jour n'est jamais effacé par lui-même.
  const entry = {
    action: "RETENTION_PURGE" as const,
    entityType: "Retention",
    entityId: "-",
    summary: `Purge de conservation : ${total} élément(s) supprimé(s)${report.fileErrors ? `, ${report.fileErrors} fichier(s) en échec` : ""}`,
    metadata: report,
  };
  if (actor) await logAudit(prisma, { ...entry, actorUserId: actor.id });
  else await prisma.auditLog.create({ data: { ...entry, actorLabel: "Tâche planifiée" } });
  return report;
}

export async function lastPurge() {
  return prisma.auditLog.findFirst({
    where: { action: "RETENTION_PURGE" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, summary: true, metadata: true },
  });
}
