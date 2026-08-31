export type BadgeTone = "success" | "neutral" | "warning" | "danger" | "muted";

const CLASSES: Record<BadgeTone, { pill: string; dot: string }> = {
  success: { pill: "bg-green-50 text-green-700", dot: "bg-green-500" },
  neutral: { pill: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-400" },
  warning: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  danger: { pill: "bg-red-50 text-red-700", dot: "bg-red-500" },
  muted: { pill: "bg-zinc-200 text-zinc-700", dot: "bg-zinc-500" },
};

// Toujours une pastille + texte, jamais du texte de statut seul (règle UX).
// Repli défensif : `tone` vient souvent d'un lookup `TONE_MAP[status] ?? ...`
// côté appelant sur un statut en `string` brut — un oubli du repli là-bas ne
// doit pas planter la page.
export function Badge({ tone, label }: { tone: BadgeTone; label: string }) {
  const { pill, dot } = CLASSES[tone] ?? CLASSES.neutral;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
