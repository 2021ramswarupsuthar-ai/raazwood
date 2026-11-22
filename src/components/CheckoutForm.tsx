'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from './cart';
import { formatINR } from '@/lib/money';
import { STATES } from '@/config/states';
import { guessStateFromPincode, isValidPincode } from '@/lib/pincode';

type Quote = { serviceable: boolean; goodsTotalPaise: number; shippingPaise: number; totalPaise: number; taxKind: 'INTRA' | 'INTER'; taxPaise: number; minDays: number; maxDays: number };
type Pending = { publicId: string; razorpayOrderId: string; amountPaise: number; keyId: string };

type RzpResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RzpOptions = Record<string, unknown>;
declare global {
  interface Window { Razorpay?: new (o: RzpOptions) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutForm() {
  const { lines, ready, clear } = useCart();
  const router = useRouter();
  const [f, setF] = useState({ name: '', phone: '', email: '', line1: '', line2: '', city: '', pincode: '', stateCode: '', notes: '' });
  const [stateTouched, setStateTouched] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const reqId = useRef(0);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  // pre-select state from the pincode (customer can change it; the chosen state decides GST type)
  useEffect(() => {
    if (!stateTouched && isValidPincode(f.pincode)) {
      const g = guessStateFromPincode(f.pincode);
      if (g) setF((p) => (p.stateCode === g ? p : { ...p, stateCode: g }));
    }
  }, [f.pincode, stateTouched]);

  // server-side price quote whenever the cart, state or pincode changes
  useEffect(() => {
    if (!ready || lines.length === 0 || !f.stateCode || !isValidPincode(f.pincode)) { setQuote(null); return; }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const r = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })), stateCode: f.stateCode, pincode: f.pincode }) });
        const data = await r.json();
        if (id !== reqId.current) return;
        if (!r.ok) { setQuote(null); setQuoteErr(data.error ?? 'Could not calculate delivery'); return; }
        setQuoteErr(''); setQuote(data as Quote);
      } catch { if (id === reqId.current) setQuoteErr('Could not calculate delivery. Check your connection.'); }
    }, 350);
    return () => clearTimeout(t);
  }, [ready, lines, f.stateCode, f.pincode]);

  async function openRazorpay(p: Pending) {
    const ok = await loadRazorpay();
    if (!ok || !window.Razorpay) { setError('Could not load the payment window. Please check your internet and try again.'); return; }
    const rzp = new window.Razorpay({
      key: p.keyId,
      amount: p.amountPaise,
      currency: 'INR',
      name: 'Raazwood',
      description: 'Solid sheesham furniture',
      order_id: p.razorpayOrderId,
      prefill: { name: f.name, contact: f.phone, email: f.email || undefined },
      theme: { color: '#7A5F3E' },
      // UPI only for now. Also make sure only UPI is enabled in your Razorpay dashboard (Settings > Payment Methods).
      config: { display: { blocks: { upi: { name: 'Pay using UPI', instruments: [{ method: 'upi' }] } }, sequence: ['block.upi'], preferences: { show_default_blocks: false } } },
      modal: { ondismiss: () => { setBusy(false); setError('Payment not completed. Your items are reserved for a few minutes. You can tap "Pay now" to try again.'); } },
      handler: async (resp: RzpResponse) => {
        try {
          await fetch('/api/checkout/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: p.publicId, ...resp }) });
        } catch { /* the webhook will still confirm the order */ }
        clear();
        router.push(`/order/${p.publicId}`);
      },
    });
    rzp.on('payment.failed', () => setError('Payment failed. You can try again with the same or another UPI app.'));
    rzp.open();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pending) { setBusy(true); await openRazorpay(pending); setBusy(false); return; }
    if (!quote || !quote.serviceable) { setError(quote && !quote.serviceable ? 'Sorry, we do not deliver to this state yet.' : 'Enter a valid pincode and state to see the delivery charge.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          customer: { name: f.name, phone: f.phone, email: f.email },
          address: { line1: f.line1, line2: f.line2, city: f.city, stateCode: f.stateCode, pincode: f.pincode },
          notes: f.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not start payment'); setBusy(false); return; }
      setPending(data as Pending);
      await openRazorpay(data as Pending);
    } catch { setError('Network error. Please try again.'); }
    setBusy(false);
  }

  if (!ready) return <p className="mt-10 text-ink/60">Loading…</p>;
  if (lines.length === 0) return (<div className="mt-10"><p>Your cart is empty.</p><Link href="/shop" className="btn btn-primary mt-4">Shop furniture</Link></div>);

  const subtotal = lines.reduce((s, l) => s + l.pricePaise * l.qty, 0);
  const locked = Boolean(pending);

  return (
    <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]" noValidate>
      <div className="space-y-8">
        <fieldset className="rounded-2xl bg-white p-6 ring-1 ring-line/70" disabled={locked}>
          <legend className="font-display text-2xl font-semibold">Contact</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="name">Full name</label><input id="name" className="field" value={f.name} onChange={set('name')} required autoComplete="name" /></div>
            <div><label className="label" htmlFor="phone">Mobile number</label><input id="phone" className="field" inputMode="tel" value={f.phone} onChange={set('phone')} required autoComplete="tel" placeholder="10-digit number" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="email">Email (optional, for order updates)</label><input id="email" type="email" className="field" value={f.email} onChange={set('email')} autoComplete="email" /></div>
          </div>
        </fieldset>

        <fieldset className="rounded-2xl bg-white p-6 ring-1 ring-line/70" disabled={locked}>
          <legend className="font-display text-2xl font-semibold">Delivery address</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label" htmlFor="line1">Address</label><input id="line1" className="field" value={f.line1} onChange={set('line1')} required autoComplete="address-line1" placeholder="House no., building, street" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="line2">Landmark / area (optional)</label><input id="line2" className="field" value={f.line2} onChange={set('line2')} autoComplete="address-line2" /></div>
            <div><label className="label" htmlFor="pincode">Pincode</label><input id="pincode" className="field" inputMode="numeric" maxLength={6} value={f.pincode} onChange={(e) => setF((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, '') }))} required autoComplete="postal-code" /></div>
            <div><label className="label" htmlFor="city">City</label><input id="city" className="field" value={f.city} onChange={set('city')} required autoComplete="address-level2" /></div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="state">State</label>
              <select id="state" className="field" value={f.stateCode} onChange={(e) => { setStateTouched(true); set('stateCode')(e); }} required autoComplete="address-level1">
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className="label" htmlFor="notes">Delivery notes (optional)</label><textarea id="notes" className="field" rows={2} maxLength={300} value={f.notes} onChange={set('notes')} placeholder="Floor, lift availability, preferred time…" /></div>
          </div>
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-line/70" aria-label="Order summary">
        <h2 className="font-display text-2xl font-semibold">Order summary</h2>
        <ul className="divide-y divide-line text-sm">
          {lines.map((l) => (<li key={l.variantId} className="flex justify-between gap-3 py-2"><span>{l.name} <span className="text-ink/60">({l.label}) × {l.qty}</span></span><span className="font-medium">{formatINR(l.pricePaise * l.qty)}</span></li>))}
        </ul>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Items</dt><dd>{formatINR(quote?.goodsTotalPaise ?? subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{quote ? (quote.shippingPaise === 0 ? 'Free' : formatINR(quote.shippingPaise)) : 'Enter pincode & state'}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{quote ? formatINR(quote.totalPaise) : '—'}</dd></div>
          {quote && <p className="text-xs text-ink/60">Includes GST of {formatINR(quote.taxPaise)} ({quote.taxKind === 'INTRA' ? 'CGST + SGST' : 'IGST'}). Estimated delivery {quote.minDays}-{quote.maxDays} days.</p>}
        </dl>
        {quoteErr && <p className="text-sm text-red-700" role="alert">{quoteErr}</p>}
        {quote && !quote.serviceable && <p className="text-sm text-red-700" role="alert">Sorry, we do not deliver to this state yet.</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy || !quote || !quote.serviceable}>{busy ? 'Please wait…' : pending ? 'Pay now' : `Pay ${quote ? formatINR(quote.totalPaise) : ''} by UPI`}</button>
        <p className="text-center text-xs text-ink/60">Payments are processed securely by Razorpay. We never see your UPI PIN.</p>
      </aside>
    </form>
  );
}
