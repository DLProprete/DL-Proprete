import { ImapFlow } from "imapflow";
import { getMailboxConfig } from "./config";

export class MailboxNotConfiguredError extends Error {}
export class MailboxUnavailableError extends Error {}

export type MailFolders = {
  inbox: string;
  sent: string;
  drafts: string;
  trash: string;
  junk: string;
};

let shared: ImapFlow | null = null;
let queue: Promise<void> = Promise.resolve();

export function encodeFolder(path: string) {
  return encodeURIComponent(path);
}

export function decodeFolder(path: string | undefined, fallback = "INBOX") {
  if (!path) return fallback;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

async function connectClient() {
  const config = getMailboxConfig();
  if (!config) throw new MailboxNotConfiguredError("Boîte mail non configurée");
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.password },
    logger: false,
  });
  await client.connect();
  client.on("close", () => {
    if (shared === client) shared = null;
  });
  client.on("error", () => {
    if (shared === client) shared = null;
  });
  shared = client;
  return client;
}

async function ensureClient() {
  if (shared?.usable) return shared;
  return connectClient();
}

export async function withImap<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  let release = () => {};
  const previous = queue;
  queue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    try {
      return await fn(await ensureClient());
    } catch (error) {
      if (error instanceof MailboxNotConfiguredError) throw error;
      try {
        await shared?.logout();
      } catch {
        /* ignore */
      }
      shared = null;
      try {
        return await fn(await ensureClient());
      } catch (retry) {
        const message = retry instanceof Error ? retry.message : "erreur inconnue";
        throw new MailboxUnavailableError(`Impossible d'accéder à la boîte OVH : ${message}`);
      }
    }
  } finally {
    release();
  }
}

export async function resolveFolders(client: ImapFlow): Promise<MailFolders> {
  const boxes = await client.list();
  const byUse = (flag: string) => boxes.find((box) => box.specialUse === flag)?.path;
  const byName = (pattern: RegExp) => boxes.find((box) => pattern.test(box.path))?.path;
  return {
    inbox: byUse("\\Inbox") || "INBOX",
    sent: byUse("\\Sent") || byName(/sent|envoy/i) || "Sent",
    drafts: byUse("\\Drafts") || byName(/draft|brouillon/i) || "Drafts",
    trash: byUse("\\Trash") || byName(/trash|corbeille/i) || "Trash",
    junk: byUse("\\Junk") || byName(/junk|spam/i) || "Junk",
  };
}

export function folderLabel(path: string, folders: MailFolders) {
  if (path === folders.inbox) return "Boîte de réception";
  if (path === folders.sent) return "Envoyés";
  if (path === folders.drafts) return "Brouillons";
  if (path === folders.trash) return "Corbeille";
  if (path === folders.junk) return "Indésirables";
  return path;
}
