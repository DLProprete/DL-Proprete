// Fichiers officiels de la charte v1.0 (docs/brand/), recadrés sur le dessin
// (public/brand/). Tracés vectoriels : aucun fichier de police n'est nécessaire
// au logo.
/* eslint-disable @next/next/no-img-element -- SVG vectoriel, next/image n'apporte rien */

// « blanc » : sur aplat marine uniquement (barre latérale, en-tête agent).
export function Logo({ className, tone = "marine" }: { className?: string; tone?: "marine" | "blanc" }) {
  return (
    <img
      src={tone === "blanc" ? "/brand/dl-proprete-logo-blanc-web.svg" : "/brand/dl-proprete-logo-web.svg"}
      alt="DL Propreté"
      width={729}
      height={117}
      className={`w-auto ${className ?? "h-6"}`}
    />
  );
}
