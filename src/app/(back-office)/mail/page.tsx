import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { listMailboxPage, MailboxNotConfiguredError, MailboxUnavailableError } from "@/server/mail/queries";
import { getMailboxConfig } from "@/server/mail/config";
import { decodeFolder, encodeFolder } from "@/server/mail/imap";
import { SelectAllCheckbox } from "@/components/select-all-checkbox";
import { bulkDeleteMailAction } from "./actions";
import { PendingButton } from "./PendingButton";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; sent?: string; draft?: string; deleted?: string }>;
}) {
  const user = await requireSession();
  if (user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const config = getMailboxConfig();
  if (!config) {
    return (
      <div className="max-w-2xl space-y-3">
        <h1 className="text-xl font-semibold">Messagerie</h1>
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Identifiants SMTP absents du fichier .env.
        </p>
      </div>
    );
  }

  let folders: { path: string; label: string }[] = [];
  let messages: Awaited<ReturnType<typeof listMailboxPage>>["messages"] = [];
  let current = decodeFolder(params.folder);
  let error: string | null = null;

  try {
    const view = await listMailboxPage(user, current);
    folders = view.folders;
    messages = view.messages;
    current = view.current;
  } catch (caught) {
    if (caught instanceof MailboxNotConfiguredError || caught instanceof MailboxUnavailableError) {
      error = caught.message;
    } else {
      throw caught;
    }
  }

  const currentMeta = folders.find((folder) => folder.path === current);
  const inTrash = currentMeta?.label === "Corbeille";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Messagerie</h1>
          <p className="mt-1 text-sm text-zinc-600">{config.user}</p>
        </div>
        <Link href="/mail/compose" className="btn btn-dark">
          Nouveau message
        </Link>
      </div>

      {params.sent && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Message envoyé.
        </p>
      )}
      {params.draft && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Brouillon enregistré.
        </p>
      )}
      {params.deleted && (
        <p className="alert alert-info">
          {inTrash ? "Message(s) supprimé(s)." : "Message(s) déplacé(s) vers la corbeille."}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {folders.map((folder) => (
          <Link
            key={folder.path}
            href={`/mail?folder=${encodeFolder(folder.path)}`}
            className={folder.path === current ? "btn btn-secondary" : "btn"}
          >
            {folder.label}
          </Link>
        ))}
      </div>

      <form action={bulkDeleteMailAction} className="space-y-3">
        <input type="hidden" name="folder" value={current} />
        <PendingButton className="btn btn-secondary" pendingLabel="Suppression…">
          {inTrash ? "Supprimer la sélection" : "Mettre à la corbeille"}
        </PendingButton>
        <div className="card-table">
          <table>
            <thead>
              <tr>
                <th className="w-10">
                  <SelectAllCheckbox targetName="uid" />
                </th>
                <th>{currentMeta?.label === "Envoyés" ? "À" : "De"}</th>
                <th>Objet</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={`${current}-${message.uid}`}>
                  <td>
                    <input type="checkbox" name="uid" value={message.uid} className="h-4 w-4" />
                  </td>
                  <td className={message.unseen ? "font-medium text-zinc-900" : "text-zinc-600"}>
                    {currentMeta?.label === "Envoyés" ? message.to : message.from}
                  </td>
                  <td>
                    <Link href={`/mail/${message.uid}?folder=${encodeFolder(current)}`} className="underline">
                      {message.subject}
                    </Link>
                  </td>
                  <td className="text-zinc-600">{formatDate(message.date)}</td>
                </tr>
              ))}
              {messages.length === 0 && !error && (
                <tr>
                  <td colSpan={4} className="text-zinc-500">Aucun message dans ce dossier.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}
