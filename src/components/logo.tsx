// Identité de marque de l'outil interne : bloc plat + libellé, police
// système (voir globals.css — pas de webfont dans cet outil, contrainte
// réseau terrain). Pas de dégradé ni de reflet décoratif, plus sobre que
// l'équivalent du site vitrine, cohérent avec le reste de l'outil.

export function LogoBadge({ className }: { className?: string }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-700 text-xs font-bold text-white ${className ?? ""}`}
      aria-hidden
    >
      DL
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoBadge />
      <span className="text-sm font-semibold text-zinc-900">DL Propreté</span>
    </span>
  );
}
