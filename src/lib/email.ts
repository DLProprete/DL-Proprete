import nodemailer from "nodemailer";

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

export function mailFromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "DL Propreté <contact@dlproprete.fr>";
}

export async function sendEmail({
  to, subject, html, text, cc, inReplyTo, references, attachments,
}: SendEmailInput) {
  const from = mailFromAddress();
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
  console.log(`[email] non envoyé\nÀ : ${to}\nSujet : ${subject}\n${bodyText}`);
}
