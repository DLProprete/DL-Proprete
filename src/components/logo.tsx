// Fichiers officiels de la charte v1.0 (docs/brand/), recadrés sur le dessin
// (public/brand/). Tracés vectoriels : aucune police à charger, la contrainte
// réseau terrain (police système) est respectée. Le monogramme ne se colle
// jamais au nom : c'est l'un OU l'autre.
/* eslint-disable @next/next/no-img-element -- SVG vectoriel, next/image n'apporte rien */

export function LogoBadge({ className }: { className?: string }) {
  return (
    <img
      src="/brand/dl-proprete-monogramme-web.svg"
      alt="DL Propreté"
      width={168}
      height={168}
      className={`h-8 w-8 shrink-0 ${className ?? ""}`}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/brand/dl-proprete-logo-web.svg"
      alt="DL Propreté"
      width={729}
      height={117}
      className={`h-6 w-auto ${className ?? ""}`}
    />
  );
}
