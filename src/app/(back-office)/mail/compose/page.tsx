import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getMessage, listMailFolders } from "@/server/mail/queries";
import { decodeFolder } from "@/server/mail/imap";
import { saveDraftAction, sendMailAction } from "../actions";
import { PendingButton } from "../PendingButton";

function replySubject(subject: string) {
  return subject.startsWith("Re:") ? subject : `Re: ${subject}`;
}

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; replyUid?: string; error?: string }>;
}) {
  const user = await requireSession();
  if (user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const folder = decodeFolder(params.folder);
  const replyUid = Number(params.replyUid);
  const folders = await listMailFolders(user);
  const draftsPath = folders.find((item) => item.label === "Brouillons")?.path ?? "Drafts";
  const isDraft = folder === draftsPath;
  const source =
    Number.isInteger(replyUid) && replyUid > 0 ? await getMessage(user, folder, replyUid) : null;

  const defaultTo = source && !isDraft ? source.from : source?.to === "—" ? "" : (source?.to ?? "");
  const defaultSubject = source ? (isDraft ? source.subject : replySubject(source.subject)) : "";
  const defaultText = source && !isDraft ? `\n\n---\n${source.from} a écrit :\n${source.text}` : (source?.text ?? "");

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/mail" className="text-sm underline">
        Retour à la messagerie
      </Link>
      <h1 className="text-xl font-semibold">{source && !isDraft ? "Répondre" : "Nouveau message"}</h1>
      {params.error === "missing" && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          Destinataire et objet sont obligatoires pour envoyer.
        </p>
      )}
      <form className="card space-y-4">
        <input type="hidden" name="inReplyTo" defaultValue={source?.messageId ?? ""} />
        <input type="hidden" name="draftUid" defaultValue={isDraft && source ? String(source.uid) : ""} />
        <div>
          <label htmlFor="to" className="block text-sm text-zinc-700">À</label>
          <input id="to" name="to" defaultValue={defaultTo === "—" ? "" : defaultTo} className="mt-1 w-full field" />
        </div>
        <div>
          <label htmlFor="cc" className="block text-sm text-zinc-700">Cc</label>
          <input id="cc" name="cc" className="mt-1 w-full field" />
        </div>
        <div>
          <label htmlFor="subject" className="block text-sm text-zinc-700">Objet</label>
          <input id="subject" name="subject" defaultValue={defaultSubject} className="mt-1 w-full field" />
        </div>
        <div>
          <label htmlFor="text" className="block text-sm text-zinc-700">Message</label>
          <textarea id="text" name="text" rows={14} defaultValue={defaultText} className="mt-1 w-full field" />
        </div>
        <div className="flex flex-wrap gap-2">
          <PendingButton className="btn btn-dark" pendingLabel="Envoi…" formAction={sendMailAction}>
            Envoyer
          </PendingButton>
          <PendingButton className="btn btn-secondary" pendingLabel="Enregistrement…" formAction={saveDraftAction}>
            Enregistrer le brouillon
          </PendingButton>
        </div>
      </form>
    </div>
  );
}
