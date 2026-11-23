'use client';
import { useEffect, useState } from 'react';

/** Heart toggle. The product page is cached for everyone, so the saved state is loaded in the browser. */
export default function WishlistButton({ productId }: { productId: string }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/wishlist').then((r) => r.json()).then((d: { productIds: string[] }) => { if (alive) setSaved(d.productIds.includes(productId)); }).catch(() => undefined);
    return () => { alive = false; };
  }, [productId]);

  async function toggle() {
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) });
      if (r.status === 401) { window.location.assign(`/account/login?next=${encodeURIComponent(window.location.pathname)}`); return; }
      const d = await r.json();
      if (r.ok) { setSaved(d.saved); setMsg(d.saved ? 'Saved to your wishlist' : 'Removed from your wishlist'); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-brand-dark transition hover:border-brand-dark">
        <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20Z" /></svg>
      </button>
      <span className="text-xs text-ink/60" role="status">{msg}</span>
    </span>
  );
}
