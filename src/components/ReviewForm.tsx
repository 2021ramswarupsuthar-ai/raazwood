'use client';
import { useState } from 'react';

export default function ReviewForm({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [f, setF] = useState({ title: '', body: '', city: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, rating, ...f }) });
      if (r.status === 401) { window.location.assign(`/account/login?next=${encodeURIComponent(window.location.pathname + '#reviews')}`); return; }
      const d = await r.json();
      setMsg(r.ok ? { ok: true, text: d.message } : { ok: false, text: d.error ?? 'Could not send your review.' });
      if (r.ok) setF({ title: '', body: '', city: '' });
    } catch {
      setMsg({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>Write a review</button>;
  if (msg?.ok) return <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">{msg.text}</p>;
  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-line/70">
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer text-2xl leading-none" title={`${n} star${n > 1 ? 's' : ''}`}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span aria-hidden="true" className={n <= rating ? 'text-brand-dark' : 'text-line'}>★</span>
              <span className="sr-only">{n} star{n > 1 ? 's' : ''}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div><label className="label" htmlFor="rv-title">Title</label><input id="rv-title" className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80} required /></div>
      <div><label className="label" htmlFor="rv-body">Your review</label><textarea id="rv-body" className="field" rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={1500} required placeholder="Quality, finish, delivery, assembly…" /></div>
      <div><label className="label" htmlFor="rv-city">City (optional)</label><input id="rv-city" className="field" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} maxLength={60} placeholder="e.g. Hyderabad" /></div>
      {msg && !msg.ok && <p className="text-sm text-red-700" role="alert">{msg.text}</p>}
      <div className="flex gap-3"><button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Submit review'}</button><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button></div>
      <p className="text-xs text-ink/60">Reviews are checked before they appear. Please do not include phone numbers or addresses.</p>
    </form>
  );
}
