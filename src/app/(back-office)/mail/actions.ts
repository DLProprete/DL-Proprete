"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { deleteMailboxMessages, saveMailboxDraft, sendMailboxMessage } from "@/server/mail/actions";
import { encodeFolder } from "@/server/mail/imap";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function sendMailAction(formData: FormData) {
  const user = await requireSession();
  const to = field(formData, "to");
  const subject = field(formData, "subject");
  if (!to || !subject) {
    redirect("/mail/compose?error=missing");
  }
  const draftUid = Number(field(formData, "draftUid"));
  await sendMailboxMessage(user, {
    to,
    cc: field(formData, "cc") || undefined,
    subject,
    text: field(formData, "text"),
    inReplyTo: field(formData, "inReplyTo") || undefined,
    draftUid: Number.isInteger(draftUid) && draftUid > 0 ? draftUid : undefined,
  });
  redirect("/mail?folder=sent&sent=1");
}

export async function saveDraftAction(formData: FormData) {
  const user = await requireSession();
  const draftUid = Number(field(formData, "draftUid"));
  await saveMailboxDraft(user, {
    to: field(formData, "to"),
    cc: field(formData, "cc") || undefined,
    subject: field(formData, "subject") || "(sans objet)",
    text: field(formData, "text"),
    draftUid: Number.isInteger(draftUid) && draftUid > 0 ? draftUid : undefined,
  });
  redirect("/mail?folder=drafts&draft=1");
}

export async function deleteMailAction(folder: string, uid: number) {
  const user = await requireSession();
  await deleteMailboxMessages(user, folder, [uid]);
  redirect(`/mail?folder=${encodeFolder(folder)}&deleted=1`);
}

export async function bulkDeleteMailAction(formData: FormData) {
  const user = await requireSession();
  const folder = field(formData, "folder") || "INBOX";
  const uids = formData.getAll("uid").map((value) => Number(value));
  if (uids.length === 0) {
    redirect(`/mail?folder=${encodeFolder(folder)}`);
  }
  await deleteMailboxMessages(user, folder, uids);
  redirect(`/mail?folder=${encodeFolder(folder)}&deleted=1`);
}
