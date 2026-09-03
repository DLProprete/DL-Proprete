import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { getMailboxConfig } from "./config";

const READ_ROLES = ["ADMIN"] as const;
const LIST_LIMIT = 50;

export class MailboxNotConfiguredError extends Error {}
export class MailboxUnavailableError extends Error {}

export type MailListItem = {
  uid: number;
  subject: string;
  from: string;
  date: Date | null;
  unseen: boolean;
};

export type MailMessage = MailListItem & {
  text: string;
};

async function withInbox<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const config = getMailboxConfig();
  if (!config) {
    throw new MailboxNotConfiguredError("Boîte mail non configurée");
  }

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.password },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      return await fn(client);
    } finally {
      lock.release();
    }
  } catch (error) {
    if (error instanceof MailboxNotConfiguredError) throw error;
    const message = error instanceof Error ? error.message : "erreur inconnue";
    throw new MailboxUnavailableError(`Impossible de lire la boîte OVH : ${message}`);
  } finally {
    try {
      await client.logout();
    } catch {
      /* déjà déconnecté */
    }
  }
}

export async function listInbox(user: SessionUser): Promise<MailListItem[]> {
  requireRole(user, [...READ_ROLES]);
  return withInbox(async (client) => {
    const exists = client.mailbox && typeof client.mailbox === "object" ? client.mailbox.exists : 0;
    if (!exists) return [];
    const from = Math.max(1, exists - LIST_LIMIT + 1);
    const items: MailListItem[] = [];
    for await (const msg of client.fetch(`${from}:${exists}`, { envelope: true, flags: true, uid: true })) {
      const fromAddress = msg.envelope?.from?.[0];
      items.push({
        uid: msg.uid,
        subject: msg.envelope?.subject?.trim() || "(sans objet)",
        from: fromAddress?.address || fromAddress?.name || "—",
        date: msg.envelope?.date ?? null,
        unseen: !(msg.flags && msg.flags.has("\\Seen")),
      });
    }
    return items.reverse();
  });
}

export async function getInboxMessage(user: SessionUser, uid: number): Promise<MailMessage | null> {
  requireRole(user, [...READ_ROLES]);
  if (!Number.isInteger(uid) || uid < 1) return null;
  return withInbox(async (client) => {
    const msg = await client.fetchOne(String(uid), { envelope: true, flags: true, uid: true, source: true }, { uid: true });
    if (!msg || !msg.source) return null;
    const parsed = await simpleParser(msg.source);
    const fromAddress = msg.envelope?.from?.[0];
    const text =
      parsed.text?.trim() ||
      parsed.html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ||
      "(message vide)";
    return {
      uid: msg.uid,
      subject: msg.envelope?.subject?.trim() || parsed.subject || "(sans objet)",
      from: fromAddress?.address || fromAddress?.name || parsed.from?.text || "—",
      date: msg.envelope?.date ?? parsed.date ?? null,
      unseen: !(msg.flags && msg.flags.has("\\Seen")),
      text,
    };
  });
}
