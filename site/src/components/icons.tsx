type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Les quatre pictogrammes métier : tracés officiels de la charte v1.0
// (docs/brand/icone-*.svg), marine seul via currentColor.
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

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

export function ZoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="7" />
      <line x1="12" y1="1.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22.5" y2="12" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m4 6.5 8 6 8-6" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M6.5 3h3l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z" />
    </svg>
  );
}

export function MessageIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 5h16v11H8l-4 4V5Z" />
    </svg>
  );
}

export function CalendarCheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="1.5" />
      <path d="M4 10h16M8 3v4M16 3v4M9 14.5l2 2 4-4.5" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
