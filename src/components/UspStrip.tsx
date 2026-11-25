import { POLICY, USPS } from '@/config/store';

const ICONS: Record<string, React.ReactNode> = {
  wood: <path d="M12 3l7 4v8l-7 4-7-4V7l7-4Zm0 6v10M12 9 8 7m4 2 4-2" />,
  delivery: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  pay: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  help: <path d="M4 5h16v11H9l-5 4V5Z" />,
  warranty: <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Zm-3 9 2 2 4-4" />,
  returns: <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />,
};

type Item = { key: string; title: string; text: string };

export default function UspStrip({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  const items: Item[] = [...USPS];
  if (POLICY.warranty) items.splice(1, 0, { key: 'warranty', title: 'Warranty', text: POLICY.warranty });
  if (POLICY.returns) items.splice(2, 0, { key: 'returns', title: 'Returns', text: POLICY.returns });
  const shown = items.slice(0, 4);
  return (
    <ul className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`} aria-label="Why shop with us">
      {shown.map((u) => (
        <li key={u.key} className={`flex items-start gap-3 rounded-xl p-3 ${dark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-white ring-1 ring-line/70'}`}>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${dark ? 'bg-brand/20 text-brand' : 'bg-brand/15 text-brand-dark'}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[u.key]}</svg>
          </span>
          <span className="min-w-0">
            <span className={`block text-sm font-semibold leading-tight ${dark ? 'text-bone' : ''}`}>{u.title}</span>
            {!compact && <span className={`mt-0.5 block text-xs leading-snug ${dark ? 'text-bone/70' : 'text-ink/60'}`}>{u.text}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
