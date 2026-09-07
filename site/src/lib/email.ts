import nodemailer from "nodemailer";

export type SendEmailInput = {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
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

export async function sendEmail({ to, replyTo, subject, text }: SendEmailInput) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "DL Propreté <contact@dlproprete.fr>";
  const transport = smtpTransport();
  if (transport) {
    await transport.sendMail({ from, to, replyTo, subject, text });
    return;
  }
  // SMTP non configuré (dev local, ou variables absentes sur Vercel) : on
  // journalise plutôt que d'échouer silencieusement, même convention que
  // l'outil interne (src/lib/email.ts).
  console.log(`[email] non envoyé (SMTP non configuré)\nÀ : ${to}\nSujet : ${subject}\n${text}`);
}
