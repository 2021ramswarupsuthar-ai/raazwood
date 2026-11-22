'use client';
import { useState } from 'react';

type Result = { valid: boolean; serviceable?: boolean; stateName?: string | null; minDays?: number; maxDays?: number };

export default function PincodeChecker({ dark = false }: { dark?: boolean }) {
  const [pin, setPin] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[1-9][0-9]{5}$/.test(pin)) { setRes({ valid: false }); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/pincode?pin=${pin}`);
      setRes((await r.json()) as Result);
    } catch {
      setRes({ valid: false });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={check} className="w-full max-w-md" aria-label="Check delivery by pincode">
      <label htmlFor="pin" className={`label ${dark ? '!text-bone' : ''}`}>Delivery pincode</label>
      <div className="flex gap-2">
        <input id="pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 500001" className="field" autoComplete="postal-code" />
        <button type="submit" disabled={busy} className="btn btn-primary !px-5">{busy ? '…' : 'Check'}</button>
      </div>
      <p className={`mt-2 min-h-5 text-sm ${dark ? 'text-bone/90' : ''}`} role="status">
        {res && !res.valid && 'Please enter a valid 6-digit pincode.'}
        {res?.valid && res.serviceable && `We deliver to ${res.stateName ?? 'your area'}. Estimated delivery ${res.minDays}-${res.maxDays} days (indicative).`}
        {res?.valid && res.serviceable === false && 'Sorry, we do not deliver to this area yet.'}
      </p>
    </form>
  );
}
