// Graphique à barres simple, en SVG pur, Server Component — pas de
// bibliothèque de dataviz dans l'outil, un seul type de graphique utilisé
// (src/app/(back-office)/reports/page.tsx). Une seule série par graphique :
// jamais plusieurs métriques d'échelles différentes sur un même graphique.
export function BarChart({
  data,
  formatValue = (v) => String(Math.round(v)),
}: {
  data: { label: string; value: number }[];
  formatValue?: (value: number) => string;
}) {
  const width = 640;
  const height = 220;
  const paddingBottom = 28;
  const paddingTop = 20;
  const plotHeight = height - paddingBottom - paddingTop;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = width / data.length;
  const barGap = Math.min(16, barWidth * 0.25);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
      <line x1={0} y1={height - paddingBottom} x2={width} y2={height - paddingBottom} className="stroke-zinc-200" />
      {data.map((d, i) => {
        const barHeight = max > 0 ? (d.value / max) * plotHeight : 0;
        const x = i * barWidth + barGap / 2;
        const y = height - paddingBottom - barHeight;
        const w = barWidth - barGap;
        return (
          <g key={`${d.label}-${i}`}>
            <rect x={x} y={y} width={w} height={barHeight} rx={4} className="fill-brand-700" />
            <text
              x={x + w / 2}
              y={y - 6}
              textAnchor="middle"
              className="fill-zinc-600"
              fontSize={11}
            >
              {formatValue(d.value)}
            </text>
            <text
              x={x + w / 2}
              y={height - paddingBottom + 16}
              textAnchor="middle"
              className="fill-zinc-500"
              fontSize={11}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
