export type BadgeTone = "success" | "neutral" | "warning" | "danger" | "muted";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-green-50 text-green-700",
  neutral: "bg-zinc-100 text-zinc-600",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  muted: "bg-zinc-200 text-zinc-700",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  success: "bg-green-500",
  neutral: "bg-zinc-400",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  muted: "bg-zinc-500",
};

// Toujours une pastille + texte, jamais du texte de statut seul (règle UX).
export function Badge({ tone, label }: { tone: BadgeTone; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]}`} />
      {label}
    </span>
  );
}
