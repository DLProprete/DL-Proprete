import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  inReplyTo?: string;
  references?: string;
  attachments?: EmailAttachment[];
};

function smtpTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
}

function envMailFrom() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "DL Propreté <contact@dlproprete.fr>";
}

// Nom réglé dans Paramètres > Alertes et e-mails ; l'adresse reste celle de la
// boîte SMTP (une autre serait refusée par OVH ou classée en spam). Nom validé
// sans guillemets ni retours à la ligne (src/lib/zod/alert-settings.ts).
export async function mailFromAddress() {
  try {
    const profile = await prisma.companyProfile.findUnique({ where: { id: "default" }, select: { mailFromName: true } });
    if (profile?.mailFromName) return `"${profile.mailFromName}" <${process.env.SMTP_USER || "contact@dlproprete.fr"}>`;
  } catch (error) {
    console.error("[email] fiche entreprise illisible, expéditeur par défaut :", error);
  }
  return envMailFrom();
}

export async function sendEmail({
  to, subject, html, text, cc, inReplyTo, references, attachments,
}: SendEmailInput) {
  const from = await mailFromAddress();
  const bodyText = text ?? html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
  const transport = smtpTransport();
  if (transport) {
    await transport.sendMail({
      from, to, cc, subject, text: bodyText,
      html: html ?? `<pre>${bodyText.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>`,
      inReplyTo, references,
      attachments: attachments?.map((file) => ({
        filename: file.filename, content: file.content, contentType: file.contentType,
      })),
    });
    return;
  }
  // En production, jamais le contenu dans les journaux (lien magique et son
  // jeton, factures, relances) : un SMTP absent est une panne, pas un repli.
  if (process.env.NODE_ENV === "production") {
    throw new Error("E-mail non envoyé : variables SMTP_* absentes en production.");
  }
  console.log(`[email] non envoyé\nÀ : ${to}\nSujet : ${subject}\n${bodyText}`);
}
