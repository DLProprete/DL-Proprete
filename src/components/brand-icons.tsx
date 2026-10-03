// Les quatre pictogrammes métier de la charte v1.0 (docs/brand/icone-*.svg),
// mêmes tracés que le site (site/src/components/icons.tsx). Marine seul,
// via currentColor ; jamais dans le logo ni à côté du nom.
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BatimentIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M9 20v-6h6v6" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function IndustrielIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M3 20V11.2L7.2 13.4V11.2L11.4 13.4V9.2H17.5V20H3" />
    </svg>
  );
}

export function ProduitsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M8 7h8v13H8z" />
      <path d="M10 7V4h4v3" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function InterventionIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="1.5" />
      <path d="M8 3v4M16 3v4M4 9h16" />
      <path d="M8 14l2.2 2.2L16 11" />
    </svg>
  );
}
