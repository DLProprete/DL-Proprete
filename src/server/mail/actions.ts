import { requireRole, type SessionUser } from "@/server/auth/session";
import { mailFromAddress, sendEmail } from "@/lib/email";
import { resolveFolders, withImap } from "./imap";
import { invalidateMailCache } from "./cache";

const WRITE_ROLES = ["ADMIN"] as const;

function rawMessage({ to, subject, text, cc }: { to: string; subject: string; text: string; cc?: string }) {
  const from = mailFromAddress();
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    text,
  ];
  return lines.filter((line) => line !== null).join("\r\n");
}

export async function sendMailboxMessage(
  user: SessionUser,
  input: { to: string; cc?: string; subject: string; text: string; inReplyTo?: string; draftUid?: number },
) {
  requireRole(user, [...WRITE_ROLES]);
  await sendEmail({
    to: input.to.split(/[,;]/).map((part) => part.trim()).filter(Boolean),
    cc: input.cc ? input.cc.split(/[,;]/).map((part) => part.trim()).filter(Boolean) : undefined,
    subject: input.subject,
    text: input.text,
    inReplyTo: input.inReplyTo,
    references: input.inReplyTo,
  });

  await withImap(async (client) => {
    const folders = await resolveFolders(client);
    await client.append(folders.sent, rawMessage(input), ["\\Seen"]);
    if (input.draftUid) {
      const lock = await client.getMailboxLock(folders.drafts);
      try {
        await client.messageDelete(String(input.draftUid), { uid: true });
      } finally {
        lock.release();
      }
    }
  });
  invalidateMailCache();
}

export async function saveMailboxDraft(
  user: SessionUser,
  input: { to: string; cc?: string; subject: string; text: string; draftUid?: number },
) {
  requireRole(user, [...WRITE_ROLES]);
  await withImap(async (client) => {
    const folders = await resolveFolders(client);
    await client.append(folders.drafts, rawMessage(input), ["\\Draft"]);
    if (input.draftUid) {
      const lock = await client.getMailboxLock(folders.drafts);
      try {
        await client.messageDelete(String(input.draftUid), { uid: true });
      } finally {
        lock.release();
      }
    }
  });
  invalidateMailCache();
}

export async function deleteMailboxMessages(user: SessionUser, folder: string, uids: number[]) {
  requireRole(user, [...WRITE_ROLES]);
  const unique = [...new Set(uids.filter((uid) => Number.isInteger(uid) && uid > 0))];
  if (unique.length === 0) return;
  await withImap(async (client) => {
    const folders = await resolveFolders(client);
    const lock = await client.getMailboxLock(folder);
    try {
      const range = unique.join(",");
      if (folder === folders.trash) {
        await client.messageDelete(range, { uid: true });
      } else {
        await client.messageMove(range, folders.trash, { uid: true });
      }
    } finally {
      lock.release();
    }
  });
  invalidateMailCache();
}

export async function deleteMailboxMessage(user: SessionUser, folder: string, uid: number) {
  await deleteMailboxMessages(user, folder, [uid]);
}
