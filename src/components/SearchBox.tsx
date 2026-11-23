'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatINR } from '@/lib/money';

type Item = { slug: string; name: string; category: string; fromPricePaise: number };

/** Header search with live suggestions (README §3.1 "Search with suggestions"). Works without JS as a GET form. */
export default function SearchBox({ className = '' }: { className?: string }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const router = useRouter();
  const listId = useId();
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setItems([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (r.ok) { setItems(((await r.json()) as { items: Item[] }).items); setActive(-1); }
      } catch { /* aborted or offline */ }
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function onKey(e: React.KeyboardEvent) {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); setOpen(false); router.push(`/product/${items[active].slug}`); }
  }

  const show = open && q.trim().length >= 2;
  return (
    <form ref={box} action="/shop" role="search" className={`relative ${className}`} onSubmit={() => setOpen(false)}>
      <label htmlFor={`${listId}-q`} className="sr-only">Search furniture</label>
      <input
        id={`${listId}-q`}
        name="q"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder="Search beds, sofas…"
        autoComplete="off"
        maxLength={60}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className="field !rounded-full !py-2 !pl-9 text-sm"
      />
      <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      {show && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl bg-white text-sm shadow-card ring-1 ring-line">
          {items.length === 0 ? <li className="px-4 py-3 text-ink/60">No matches. Press Enter to search all.</li> : items.map((it, i) => (
            <li key={it.slug} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <a href={`/product/${it.slug}`} className={`flex justify-between gap-3 px-4 py-2.5 hover:bg-bone ${i === active ? 'bg-bone' : ''}`} onClick={() => setOpen(false)}>
                <span><span className="font-medium">{it.name}</span><span className="block text-xs text-ink/60">{it.category}</span></span>
                <span className="whitespace-nowrap text-ink/70">{formatINR(it.fromPricePaise)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
