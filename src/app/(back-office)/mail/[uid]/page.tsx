import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getMessage } from "@/server/mail/queries";
import { decodeFolder, encodeFolder } from "@/server/mail/imap";
import { deleteMailAction } from "../actions";
import { PendingButton } from "../PendingButton";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

export default async function MailMessagePage({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ folder?: string }>;
}) {
  const user = await requireSession();
  if (user.role !== "ADMIN") redirect("/");

  const { uid: rawUid } = await params;
  const { folder: rawFolder } = await searchParams;
  const folder = decodeFolder(rawFolder);
  const uid = Number(rawUid);
  const message = Number.isInteger(uid) ? await getMessage(user, folder, uid) : null;
  if (!message) notFound();

  const replyQuery = new URLSearchParams({
    folder,
    replyUid: String(uid),
  });
  const deleteMessage = deleteMailAction.bind(null, folder, uid);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={`/mail?folder=${encodeFolder(folder)}`} className="text-sm underline">
        Retour à la messagerie
      </Link>
      <div>
        <h1 className="text-xl font-semibold">{message.subject}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          De {message.from} · À {message.to} · {formatDate(message.date)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/mail/compose?${replyQuery.toString()}`} className="btn btn-dark">
          Répondre
        </Link>
        <form action={deleteMessage}>
          <PendingButton className="btn btn-secondary" pendingLabel="Suppression…">
            Supprimer
          </PendingButton>
        </form>
      </div>
      <pre className="card whitespace-pre-wrap break-words font-sans text-sm text-zinc-800">
        {message.text}
      </pre>
    </div>
  );
}
