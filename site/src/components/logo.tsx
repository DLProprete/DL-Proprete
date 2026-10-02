// Fichier officiel de la charte v1.0 (docs/brand/), recadré sur le dessin :
// la zone de protection (hauteur du D) est assurée par l'espacement autour.
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG vectoriel, next/image n'apporte rien
    <img
      src="/brand/dl-proprete-logo-web.svg"
      alt="DL Propreté"
      width={729}
      height={117}
      className={`h-7 w-auto ${className ?? ""}`}
    />
  );
}
