export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <span
        className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand text-sm font-bold tracking-tight text-white before:absolute before:-top-3 before:-right-2 before:h-16 before:w-4 before:rotate-[20deg] before:bg-white/15"
        aria-hidden
      >
        DL
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-base tracking-tight text-brand">
          <span className="font-bold">DL</span> <span className="font-medium">Propreté</span>
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-accent-dark">
          Depuis 2011
        </span>
      </span>
    </span>
  );
}
