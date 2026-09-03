import nodemailer from "nodemailer";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  inReplyTo?: string;
  references?: string;
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

export async function sendEmail({ to, subject, html, text, cc, inReplyTo, references }: SendEmailInput) {
  const from = mailFromAddress();
  const bodyText = text ?? html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
  const transport = smtpTransport();
  if (transport) {
    await transport.sendMail({
      from,
      to,
      cc,
      subject,
      text: bodyText,
      html: html ?? `<pre>${escapeHtml(bodyText)}</pre>`,
      inReplyTo,
      references,
    });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] (SMTP/RESEND absents, non envoyé)\nÀ : ${to}\nSujet : ${subject}\n${bodyText}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html: html ?? `<pre>${escapeHtml(bodyText)}</pre>`,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Échec de l'envoi de l'e-mail (${response.status}) : ${body}`);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
