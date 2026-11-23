'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'rw_consent_v1'; // 'all' | 'essential'
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

function loadAnalytics() {
  if (!GA_ID || !/^G-[A-Z0-9]+$/.test(GA_ID) || document.getElementById('ga4')) return;
  const s = document.createElement('script');
  s.id = 'ga4';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() { w.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
  w.gtag('js', new Date());
  w.gtag('config', GA_ID, { anonymize_ip: true });
}

/**
 * Cookie notice (README §10, DPDP Act 2023). Only essential cookies (cart, login session) are used unless the
 * visitor accepts analytics. Analytics (GA4) loads only after "Accept" and only when NEXT_PUBLIC_GA_ID is set.
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let choice: string | null = null;
    try { choice = localStorage.getItem(KEY); } catch { /* storage blocked: ask every visit */ }
    if (choice === 'all') loadAnalytics();
    if (!choice) setShow(true);
  }, []);

  const decide = (v: 'all' | 'essential') => {
    try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
    if (v === 'all') loadAnalytics();
    setShow(false);
  };

  if (!show) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie preferences" className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-2xl rounded-2xl bg-walnut p-5 text-sm text-bone shadow-card sm:bottom-5">
      <p>We use essential cookies to keep your cart and login working. With your permission we also use analytics cookies to understand how the site is used and improve it. See our <Link href="/privacy-policy" className="text-brand underline">privacy policy</Link>.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => decide('all')} className="btn btn-light !py-2">Accept all</button>
        <button type="button" onClick={() => decide('essential')} className="btn !border !border-bone/40 !py-2 text-bone hover:bg-white/10">Essential only</button>
      </div>
    </div>
  );
}
