import { formatINR } from '@/lib/money';

export type Day = { label: string; paise: number; orders: number };

/** Dependency-free bar chart (server-rendered SVG) with a text table fallback for screen readers. */
export default function SalesChart({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.paise));
  const W = 700, H = 200, pad = 8, bw = (W - pad * 2) / days.length;
  const total = days.reduce((s, d) => s + d.paise, 0);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="h-auto w-full" role="img" aria-label={`Sales for the last ${days.length} days, total ${formatINR(total)}`}>
        {[0, 0.5, 1].map((t) => <line key={t} x1={pad} x2={W - pad} y1={H - t * (H - 20)} y2={H - t * (H - 20)} stroke="#E6DCCF" strokeDasharray={t === 0 ? undefined : '3 4'} />)}
        {days.map((d, i) => {
          const h = d.paise === 0 ? 2 : Math.max(4, (d.paise / max) * (H - 20));
          const x = pad + i * bw + bw * 0.18;
          return (
            <g key={d.label + i}>
              <rect x={x} y={H - h} width={bw * 0.64} height={h} rx={4} fill={d.paise ? '#AB8D69' : '#E6DCCF'}><title>{`${d.label}: ${formatINR(d.paise)} (${d.orders} order${d.orders === 1 ? '' : 's'})`}</title></rect>
              {(i % 2 === 0 || days.length <= 8) && <text x={x + bw * 0.32} y={H + 18} textAnchor="middle" fontSize="11" fill="#7a6a5b">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">Daily sales: {days.map((d) => `${d.label} ${formatINR(d.paise)}`).join(', ')}</figcaption>
    </figure>
  );
}
