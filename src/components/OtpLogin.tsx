'use client';
import { useEffect, useRef, useState } from 'react';

type Step = 'phone' | 'code';

export default function OtpLogin({ next }: { next: string }) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/auth/otp/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? 'Could not send the code.');
        if (d.retryAfterMs) setWait(Math.ceil(d.retryAfterMs / 1000));
        return;
      }
      setPhone(d.phone);
      setDevCode(d.devCode ?? '');
      setStep('code');
      setCode('');
      setWait(30);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code }) });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? 'Could not verify the code.'); return; }
      // full navigation so the server components re-render with the new session cookie
      window.location.assign(d.isNew && next === '/account' ? '/account/profile?welcome=1' : next);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 shadow-card ring-1 ring-line/70">
      <h1 className="font-display text-3xl font-semibold">Log in or sign up</h1>
      <p className="mt-2 text-sm text-ink/70">Use your mobile number. We will send you a one-time code. No password needed.</p>

      {step === 'phone' ? (
        <form onSubmit={send} className="mt-6 space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="phone">Mobile number</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-line bg-bone px-3 text-sm text-ink/70">+91</span>
              <input id="phone" className="field !rounded-l-none" inputMode="tel" autoComplete="tel-national" placeholder="10-digit number" value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={15} />
            </div>
          </div>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy || wait > 0}>{busy ? 'Sending…' : wait > 0 ? `Wait ${wait}s` : 'Send code'}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-4" noValidate>
          <p className="text-sm">Code sent to <strong>+91 {phone}</strong>. <button type="button" className="text-brand-dark underline" onClick={() => { setStep('phone'); setError(''); }}>Change</button></p>
          {devCode && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">
              Development mode (no SMS provider set up): your code is <strong className="font-mono">{devCode}</strong>. It is also printed in the server console.
            </p>
          )}
          <div>
            <label className="label" htmlFor="code">6-digit code</label>
            <input ref={codeRef} id="code" className="field text-center font-mono text-xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required />
          </div>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify and continue'}</button>
          <button type="button" className="w-full text-sm text-brand-dark underline disabled:no-underline disabled:opacity-50" disabled={wait > 0 || busy} onClick={() => send()}>{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}</button>
        </form>
      )}
      <p className="mt-6 text-xs text-ink/60">By continuing you agree to our <a href="/terms" className="underline">terms</a> and <a href="/privacy-policy" className="underline">privacy policy</a>. Guest checkout is always available.</p>
    </div>
  );
}
