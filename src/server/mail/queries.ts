import { simpleParser } from "mailparser";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { folderLabel, resolveFolders, withImap } from "./imap";
import { cachedFolders, cachedList } from "./cache";

export { MailboxNotConfiguredError, MailboxUnavailableError } from "./imap";

const READ_ROLES = ["ADMIN"] as const;
const LIST_LIMIT = 50;

export type MailFolder = { path: string; label: string };

export type MailListItem = {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: Date | null;
  unseen: boolean;
};

export type MailMessage = MailListItem & {
  text: string;
  messageId: string | null;
};

function navFromResolved(folders: Awaited<ReturnType<typeof resolveFolders>>): MailFolder[] {
  return [
    { path: folders.inbox, label: folderLabel(folders.inbox, folders) },
    { path: folders.sent, label: folderLabel(folders.sent, folders) },
    { path: folders.drafts, label: folderLabel(folders.drafts, folders) },
    { path: folders.junk, label: folderLabel(folders.junk, folders) },
    { path: folders.trash, label: folderLabel(folders.trash, folders) },
  ];
}

async function fetchMessageList(folder: string): Promise<MailListItem[]> {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      const exists = client.mailbox && typeof client.mailbox === "object" ? client.mailbox.exists : 0;
      if (!exists) return [];
      const from = Math.max(1, exists - LIST_LIMIT + 1);
      const items: MailListItem[] = [];
      for await (const msg of client.fetch(`${from}:${exists}`, { envelope: true, flags: true, uid: true })) {
        items.push(toListItem(msg));
      }
      return items.reverse();
    } finally {
      lock.release();
    }
  });
}

export async function listMailFolders(user: SessionUser) {
  requireRole(user, [...READ_ROLES]);
  return cachedFolders(() => withImap(async (client) => navFromResolved(await resolveFolders(client))));
}

export async function listMessages(user: SessionUser, folder: string): Promise<MailListItem[]> {
  requireRole(user, [...READ_ROLES]);
  return cachedList(folder, () => fetchMessageList(folder));
}

export async function listMailboxPage(user: SessionUser, requestedFolder: string) {
  requireRole(user, [...READ_ROLES]);
  const folders = await cachedFolders(() =>
    withImap(async (client) => navFromResolved(await resolveFolders(client))),
  );
  const match = folders.find(
    (folder) => folder.path === requestedFolder || folder.path.toLowerCase() === requestedFolder.toLowerCase(),
  );
  const current = match?.path ?? folders[0]?.path ?? "INBOX";
  const messages = await cachedList(current, () => fetchMessageList(current));
  return { folders, current, messages };
}

export async function getMessage(user: SessionUser, folder: string, uid: number): Promise<MailMessage | null> {
  requireRole(user, [...READ_ROLES]);
  if (!Number.isInteger(uid) || uid < 1) return null;
  return withImap(async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      const msg = await client.fetchOne(
        String(uid),
        { envelope: true, flags: true, uid: true, source: true },
        { uid: true },
      );
      if (!msg || !msg.source) return null;
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      const parsed = await simpleParser(msg.source);
      const text =
        parsed.text?.trim() ||
        parsed.html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ||
        "(message vide)";
      return {
        ...toListItem(msg),
        text,
        messageId: parsed.messageId ?? null,
      };
    } finally {
      lock.release();
    }
  });
}

function formatAddresses(list: { name?: string; address?: string }[] | undefined) {
  if (!list?.length) return "—";
  return list.map((item) => item.address || item.name || "—").join(", ");
}

function toListItem(msg: {
  uid: number;
  envelope?: {
    subject?: string | null;
    from?: { name?: string; address?: string }[];
    to?: { name?: string; address?: string }[];
    date?: Date | null;
  } | null;
  flags?: Set<string>;
}): MailListItem {
  return {
    uid: msg.uid,
    subject: msg.envelope?.subject?.trim() || "(sans objet)",
    from: formatAddresses(msg.envelope?.from),
    to: formatAddresses(msg.envelope?.to),
    date: msg.envelope?.date ?? null,
    unseen: !(msg.flags && msg.flags.has("\\Seen")),
  };
}
