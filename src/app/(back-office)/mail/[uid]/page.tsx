import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getInboxMessage } from "@/server/mail/queries";

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
}: {
  params: Promise<{ uid: string }>;
}) {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const { uid: rawUid } = await params;
  const uid = Number(rawUid);
  const message = Number.isInteger(uid) ? await getInboxMessage(user, uid) : null;
  if (!message) {
    notFound();
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/mail" className="text-sm underline">
        Retour à la messagerie
      </Link>
      <div>
        <h1 className="text-xl font-semibold">{message.subject}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          De {message.from} · {formatDate(message.date)}
        </p>
      </div>
      <pre className="card whitespace-pre-wrap break-words font-sans text-sm text-zinc-800">
        {message.text}
      </pre>
    </div>
  );
}
