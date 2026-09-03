import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import {
  listInbox,
  MailboxNotConfiguredError,
  MailboxUnavailableError,
} from "@/server/mail/queries";
import { getMailboxConfig } from "@/server/mail/config";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

export default async function MailPage() {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const config = getMailboxConfig();
  if (!config) {
    return (
      <div className="max-w-2xl space-y-3">
        <h1 className="text-xl font-semibold">Messagerie</h1>
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          La boîte n'est pas encore lisible ici. Ajoutez dans le fichier .env
          <code className="mx-1">SMTP_USER</code> et
          <code className="mx-1">SMTP_PASSWORD</code> (déjà utilisés pour l'envoi),
          puis redémarrez l'application.
        </p>
      </div>
    );
  }

  let messages;
  let error: string | null = null;
  try {
    messages = await listInbox(user);
  } catch (caught) {
    if (caught instanceof MailboxNotConfiguredError || caught instanceof MailboxUnavailableError) {
      error = caught.message;
      messages = [];
    } else {
      throw caught;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Messagerie</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Boîte partagée {config.user} — 50 derniers messages, lecture seule.
        </p>
      </div>
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
      <div className="card-table">
        <table>
          <thead>
            <tr>
              <th>De</th>
              <th>Objet</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr key={message.uid}>
                <td className={message.unseen ? "font-medium text-zinc-900" : "text-zinc-600"}>
                  {message.from}
                </td>
                <td>
                  <Link href={`/mail/${message.uid}`} className="underline">
                    {message.subject}
                  </Link>
                </td>
                <td className="text-zinc-600">{formatDate(message.date)}</td>
              </tr>
            ))}
            {messages.length === 0 && !error && (
              <tr>
                <td colSpan={3} className="text-zinc-500">
                  Aucun message dans la boîte de réception.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
