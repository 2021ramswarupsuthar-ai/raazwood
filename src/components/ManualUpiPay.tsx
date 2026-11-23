'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { publicId: string; amount: string; vpa: string; payeeName: string; link: string; qrDataUrl: string; expiresAt: string; utrSubmitted: boolean };

/** README §6 option B: pay the exact amount to our UPI ID, then send the UTR. The admin confirms it. */
export default function ManualUpiPay(p: Props) {
  const [utr, setUtr] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  if (p.utrSubmitted) {
    return (
      <div className="mt-8 rounded-2xl bg-amber-50 p-6 text-amber-950 ring-1 ring-amber-200" role="status">
        <p className="font-display text-2xl font-semibold">We are checking your payment</p>
        <p className="mt-2 text-sm">Thank you. We received your UPI reference and will confirm your order after matching it with our bank statement (usually within a few working hours). Your items stay reserved meanwhile.</p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/checkout/utr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: p.publicId, utr }) });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? 'Could not save the reference.'); return; }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-card ring-1 ring-line/70" aria-labelledby="pay-h">
      <h2 id="pay-h" className="font-display text-2xl font-semibold">Pay {p.amount} by UPI</h2>
      <p className="mt-1 text-sm text-ink/70">Pay the <strong>exact amount</strong> using any UPI app, then enter the 12-digit UPI reference (UTR) below. Please pay before {new Date(p.expiresAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} or the items are released.</p>
      <div className="mt-5 grid items-center gap-6 sm:grid-cols-[200px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URL generated on the server */}
        <img src={p.qrDataUrl} alt={`UPI QR code to pay ${p.amount} to ${p.vpa}`} width={200} height={200} className="rounded-xl ring-1 ring-line" />
        <div className="space-y-3 text-sm">
          <p>UPI ID: <strong className="font-mono">{p.vpa}</strong> <button type="button" className="ml-1 text-brand-dark underline" onClick={() => { navigator.clipboard?.writeText(p.vpa).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => undefined); }}>{copied ? 'Copied' : 'Copy'}</button></p>
          <p>Name: {p.payeeName}</p>
          <p>Amount: <strong>{p.amount}</strong></p>
          <a href={p.link} className="btn btn-primary sm:hidden">Open UPI app</a>
          <p className="text-xs text-ink/60">On a phone, tap “Open UPI app”. On a computer, scan the QR code with your phone.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><label htmlFor="utr" className="label">UPI reference / UTR number</label><input id="utr" className="field font-mono" inputMode="numeric" maxLength={30} value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 412345678901" required /></div>
        <button className="btn btn-primary" disabled={busy || utr.replace(/\D/g, '').length < 10}>{busy ? 'Sending…' : 'I have paid'}</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  );
}
