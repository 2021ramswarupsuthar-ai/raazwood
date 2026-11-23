'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from './cart';
import { formatINR } from '@/lib/money';
import { STATES } from '@/config/states';
import { guessStateFromPincode, isValidPincode } from '@/lib/pincode';

type Quote = {
  serviceable: boolean; goodsTotalPaise: number; discountPaise: number; shippingPaise: number; totalPaise: number; taxKind: 'INTRA' | 'INTER'; taxPaise: number; minDays: number; maxDays: number;
  coupon: { code: string; discountPaise?: number; error?: string } | null;
};
type RzpPending = { method: 'razorpay'; publicId: string; razorpayOrderId: string; amountPaise: number; keyId: string };
type SavedAddress = { id: string; name: string; phone: string; line1: string; line2: string; city: string; stateCode: string; pincode: string; isDefault: boolean };
type Profile = { loggedIn: false } | { loggedIn: true; name: string; phone: string; email: string; addresses: SavedAddress[] };

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

const EMPTY = { name: '', phone: '', email: '', line1: '', line2: '', city: '', pincode: '', stateCode: '', notes: '' };

export default function CheckoutForm() {
  const { lines, ready, clear, remove } = useCart();
  const [notice, setNotice] = useState('');
  const router = useRouter();
  const [f, setF] = useState(EMPTY);
  const [stateTouched, setStateTouched] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addressId, setAddressId] = useState<string>('new');
  const [saveAddress, setSaveAddress] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<RzpPending | null>(null);
  const reqId = useRef(0);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  function pickAddress(a: SavedAddress) {
    setAddressId(a.id);
    setStateTouched(true);
    setF((p) => ({ ...p, name: a.name || p.name, phone: a.phone || p.phone, line1: a.line1, line2: a.line2, city: a.city, pincode: a.pincode, stateCode: a.stateCode }));
  }

  // logged-in customers: pre-fill contact details and the default saved address
  useEffect(() => {
    fetch('/api/account/checkout-profile').then((r) => r.json()).then((p: Profile) => {
      setProfile(p);
      if (!p.loggedIn) return;
      setF((prev) => ({ ...prev, name: prev.name || p.name, phone: prev.phone || p.phone, email: prev.email || p.email }));
      const def = p.addresses.find((a) => a.isDefault) ?? p.addresses[0];
      if (def) { pickAddress(def); setSaveAddress(false); }
    }).catch(() => setProfile({ loggedIn: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pre-select state from the pincode (customer can change it; the chosen state decides GST type)
  useEffect(() => {
    if (!stateTouched && isValidPincode(f.pincode)) {
      const g = guessStateFromPincode(f.pincode);
      if (g) setF((p) => (p.stateCode === g ? p : { ...p, stateCode: g }));
    }
  }, [f.pincode, stateTouched]);

  // server-side price quote whenever the cart, state, pincode or coupon changes
  useEffect(() => {
    if (!ready || lines.length === 0 || !f.stateCode || !isValidPincode(f.pincode)) { setQuote(null); return; }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const r = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })), stateCode: f.stateCode, pincode: f.pincode, couponCode: coupon }) });
        const data = await r.json();
        if (id !== reqId.current) return;
        if (!r.ok) {
          setQuote(null);
          // products removed or hidden since they were added: take them out so the customer is not stuck
          if (Array.isArray(data.missing) && data.missing.length) {
            const gone = lines.filter((l) => data.missing.includes(l.variantId));
            gone.forEach((l) => remove(l.variantId));
            setNotice(`Removed from your cart because ${gone.length === 1 ? 'it is' : 'they are'} no longer available: ${gone.map((l) => l.name).join(', ')}.`);
            return;
          }
          setQuoteErr(data.error ?? 'Could not calculate delivery');
          return;
        }
        setQuoteErr(''); setQuote(data as Quote);
      } catch { if (id === reqId.current) setQuoteErr('Could not calculate delivery. Check your connection.'); }
    }, 350);
    return () => clearTimeout(t);
  }, [ready, lines, f.stateCode, f.pincode, coupon, remove]);

  async function openRazorpay(p: RzpPending) {
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
    if (quote.coupon?.error) { setError('Remove the coupon that cannot be applied, or try another code.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          customer: { name: f.name, phone: f.phone, email: f.email },
          address: { line1: f.line1, line2: f.line2, city: f.city, stateCode: f.stateCode, pincode: f.pincode },
          notes: f.notes,
          couponCode: coupon,
          saveAddress: profile?.loggedIn ? addressId === 'new' && saveAddress : false,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not place your order'); setBusy(false); return; }
      if (data.method === 'manual_upi') {
        clear();
        router.push(`/order/${data.publicId}`);
        return;
      }
      setPending(data as RzpPending);
      await openRazorpay(data as RzpPending);
    } catch { setError('Network error. Please try again.'); }
    setBusy(false);
  }

  if (!ready) return <p className="mt-10 text-ink/60">Loading…</p>;
  const noticeBox = notice ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">{notice}</p> : null;
  if (lines.length === 0) return (<div className="mt-10 space-y-4">{noticeBox}<p>Your cart is empty.</p><Link href="/shop" className="btn btn-primary">Shop furniture</Link></div>);

  const subtotal = lines.reduce((s, l) => s + l.pricePaise * l.qty, 0);
  const locked = Boolean(pending);
  const saved = profile?.loggedIn ? profile.addresses : [];

  return (
    <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]" noValidate>
      <div className="space-y-8">
        {noticeBox}
        {profile && !profile.loggedIn && (
          <p className="rounded-xl bg-white p-4 text-sm ring-1 ring-line/70">Have an account? <Link href="/account/login?next=/checkout" className="font-semibold text-brand-dark underline">Log in</Link> to use your saved addresses. Or continue as a guest.</p>
        )}
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
          {saved.length > 0 && (
            <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Saved addresses">
              {saved.map((a) => (
                <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${addressId === a.id ? 'border-brand-dark bg-bone' : 'border-line'}`}>
                  <input type="radio" name="savedAddress" checked={addressId === a.id} onChange={() => pickAddress(a)} className="mt-1" />
                  <span><span className="font-medium">{a.name}</span> · {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.pincode}</span>
                </label>
              ))}
              <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${addressId === 'new' ? 'border-brand-dark bg-bone' : 'border-line'}`}>
                <input type="radio" name="savedAddress" checked={addressId === 'new'} onChange={() => { setAddressId('new'); setStateTouched(false); setSaveAddress(true); setF((p) => ({ ...p, line1: '', line2: '', city: '', pincode: '', stateCode: '' })); }} className="mt-1" />
                <span className="font-medium">Use a new address</span>
              </label>
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label" htmlFor="line1">Address</label><input id="line1" className="field" value={f.line1} onChange={(e) => { setAddressId('new'); set('line1')(e); }} required autoComplete="address-line1" placeholder="House no., building, street" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="line2">Landmark / area (optional)</label><input id="line2" className="field" value={f.line2} onChange={set('line2')} autoComplete="address-line2" /></div>
            <div><label className="label" htmlFor="pincode">Pincode</label><input id="pincode" className="field" inputMode="numeric" maxLength={6} value={f.pincode} onChange={(e) => { setAddressId('new'); setF((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, '') })); }} required autoComplete="postal-code" /></div>
            <div><label className="label" htmlFor="city">City</label><input id="city" className="field" value={f.city} onChange={set('city')} required autoComplete="address-level2" /></div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="state">State</label>
              <select id="state" className="field" value={f.stateCode} onChange={(e) => { setStateTouched(true); set('stateCode')(e); }} required autoComplete="address-level1">
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className="label" htmlFor="notes">Delivery notes (optional)</label><textarea id="notes" className="field" rows={2} maxLength={300} value={f.notes} onChange={set('notes')} placeholder="Floor, lift availability, preferred time…" /></div>
            {profile?.loggedIn && addressId === 'new' && (
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> Save this address to my account</label>
            )}
          </div>
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-line/70" aria-label="Order summary">
        <h2 className="font-display text-2xl font-semibold">Order summary</h2>
        <ul className="divide-y divide-line text-sm">
          {lines.map((l) => (<li key={l.variantId} className="flex justify-between gap-3 py-2"><span>{l.name} <span className="text-ink/60">({l.label}) × {l.qty}</span></span><span className="font-medium">{formatINR(l.pricePaise * l.qty)}</span></li>))}
        </ul>

        <div>
          {coupon ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-bone px-3 py-2 text-sm">
              <span>Coupon <strong className="font-mono">{coupon}</strong>{quote?.coupon?.discountPaise ? ' applied' : ''}</span>
              <button type="button" className="text-brand-dark underline" disabled={locked} onClick={() => { setCoupon(''); setCouponInput(''); }}>Remove</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label htmlFor="coupon" className="sr-only">Coupon code</label>
              <input id="coupon" className="field !py-2 uppercase" placeholder="Coupon code" value={couponInput} maxLength={24} disabled={locked} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setCoupon(couponInput.trim()); } }} />
              <button type="button" className="btn btn-ghost !px-4 !py-2" disabled={locked || !couponInput.trim()} onClick={() => setCoupon(couponInput.trim())}>Apply</button>
            </div>
          )}
          {quote?.coupon?.error && <p className="mt-1 text-sm text-red-700" role="alert">{quote.coupon.error}</p>}
          {coupon && !quote && <p className="mt-1 text-xs text-ink/60">Enter your pincode and state to check the coupon.</p>}
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Items</dt><dd>{formatINR(quote?.goodsTotalPaise ?? subtotal)}</dd></div>
          {quote && quote.discountPaise > 0 && <div className="flex justify-between text-green-800"><dt>Coupon discount</dt><dd>−{formatINR(quote.discountPaise)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{quote ? (quote.shippingPaise === 0 ? 'Free' : formatINR(quote.shippingPaise)) : 'Enter pincode & state'}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{quote ? formatINR(quote.totalPaise) : '—'}</dd></div>
          {quote && <p className="text-xs text-ink/60">Includes GST of {formatINR(quote.taxPaise)} ({quote.taxKind === 'INTRA' ? 'CGST + SGST' : 'IGST'}). Estimated delivery {quote.minDays}-{quote.maxDays} days.</p>}
        </dl>
        {quoteErr && <p className="text-sm text-red-700" role="alert">{quoteErr}</p>}
        {quote && !quote.serviceable && <p className="text-sm text-red-700" role="alert">Sorry, we do not deliver to this state yet.</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy || !quote || !quote.serviceable}>{busy ? 'Please wait…' : pending ? 'Pay now' : `Place order · Pay ${quote ? formatINR(quote.totalPaise) : ''} by UPI`}</button>
        <p className="text-center text-xs text-ink/60">Pay with any UPI app. We never see your UPI PIN.</p>
      </aside>
    </form>
  );
}
