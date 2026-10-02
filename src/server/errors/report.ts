import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// Remontée des erreurs serveur sans service tiers : une ligne « Erreur
// serveur » dans le journal d'audit (visible et filtrable dans /audit) et,
// si ERROR_ALERT_EMAIL est défini, un e-mail d'alerte — au plus un par heure.
export const ALERT_INTERVAL_MS = 60 * 60 * 1000;

export type ServerErrorReport = {
  message: string;
  digest?: string;
  method: string;
  path: string;
  routeType?: string;
};

// Dernière alerte de cette instance : réservée de façon synchrone, avant tout
// await, pour que N erreurs simultanées n'envoient pas N e-mails. Sert aussi
// de seule limite si la base est en panne (cas où l'alerte compte le plus).
let lastAlertAt = 0;

// Entre instances : compté depuis la dernière alerte envoyée
// (metadata.alerted), pas depuis la dernière erreur — sinon une erreur toutes
// les 10 min ne ré-alerterait jamais.
async function alertedElsewhere(now: Date): Promise<boolean> {
  try {
    const previous = await prisma.auditLog.findFirst({
      where: {
        action: "SERVER_ERROR",
        createdAt: { gte: new Date(now.getTime() - ALERT_INTERVAL_MS), lte: now },
        metadata: { path: ["alerted"], equals: true },
      },
      select: { id: true },
    });
    return previous !== null;
  } catch {
    return false;
  }
}

async function shouldAlert(now: Date): Promise<boolean> {
  if (!process.env.ERROR_ALERT_EMAIL || now.getTime() - lastAlertAt < ALERT_INTERVAL_MS) return false;
  lastAlertAt = now.getTime();
  return !(await alertedElsewhere(now));
}

// Ne lève jamais : un rapporteur d'erreur qui plante masquerait l'erreur d'origine.
export async function reportServerError(report: ServerErrorReport, now = new Date()): Promise<{ alerted: boolean }> {
  try {
    const path = report.path.split("?")[0]; // la requête peut contenir des termes de recherche
    const summary = `${report.method} ${path} — ${report.message}`.slice(0, 300);
    const alert = await shouldAlert(now);
    await prisma.auditLog
      .create({
        data: {
          action: "SERVER_ERROR",
          entityType: "ServerError",
          entityId: report.digest ?? "-",
          summary,
          metadata: { routeType: report.routeType ?? null, alerted: alert },
          createdAt: now,
        },
      })
      .catch((error: unknown) => console.error("[erreurs] journalisation impossible :", error));

    const to = process.env.ERROR_ALERT_EMAIL;
    if (!to || !alert) return { alerted: false };
    // Sans le message d'erreur : il peut recopier des données saisies
    // (erreurs Prisma) ; il reste consultable dans la page Audit.
    await sendEmail({
      to,
      subject: "[DL Propreté] Erreur serveur",
      text:
        `${report.method} ${path}\nRéférence : ${report.digest ?? "-"}\n\n` +
        "Détail et erreurs suivantes : page Audit, action « Erreur serveur ». " +
        "Pas d'autre alerte avant une heure.",
    });
    return { alerted: true };
  } catch (error) {
    console.error("[erreurs] rapport impossible :", error);
    return { alerted: false };
  }
}
