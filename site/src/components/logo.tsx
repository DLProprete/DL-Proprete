export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-sm font-bold tracking-tight text-white shadow-sm shadow-brand/30"
        aria-hidden
      >
        DL
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight text-brand">
          DL Propreté
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-accent">
          Depuis 2011
        </span>
      </span>
    </span>
  );
}
