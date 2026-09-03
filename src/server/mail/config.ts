export type MailboxConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
};

export function getMailboxConfig(
  env: NodeJS.ProcessEnv = process.env,
): MailboxConfig | null {
  const user = env.IMAP_USER || env.SMTP_USER;
  const password = env.IMAP_PASSWORD || env.SMTP_PASSWORD;
  if (!user || !password) return null;
  return {
    host: env.IMAP_HOST || "imap.mail.ovh.net",
    port: Number(env.IMAP_PORT || 993),
    user,
    password,
  };
}
