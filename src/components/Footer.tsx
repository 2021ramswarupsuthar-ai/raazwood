import Link from 'next/link';
import Logo from './Logo';
import { STORE } from '@/config/store';

export default function Footer() {
  return (
    <footer className="mt-24 bg-walnut text-bone/80">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo className="h-8 w-auto" light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{STORE.tagline}. Raazwood is a brand of {STORE.legalName}.</p>
          <p className="mt-4 text-sm">{STORE.address}</p>
          {STORE.gstin ? <p className="mt-1 text-sm">GSTIN: {STORE.gstin}</p> : null}
        </div>
        <nav aria-label="Shop" className="text-sm">
          <p className="eyebrow !text-brand">Shop</p>
          <ul className="mt-4 space-y-2">
            <li><Link href="/shop" className="hover:text-white">All furniture</Link></li>
            <li><Link href="/furniture-in/hyderabad" className="hover:text-white">Furniture in Hyderabad</Link></li>
            <li><Link href="/furniture-in/bengaluru" className="hover:text-white">Furniture in Bengaluru</Link></li>
            <li><Link href="/furniture-in/chennai" className="hover:text-white">Furniture in Chennai</Link></li>
            <li><Link href="/blog" className="hover:text-white">Buying guides</Link></li>
          </ul>
        </nav>
        <nav aria-label="Help" className="text-sm">
          <p className="eyebrow !text-brand">Help</p>
          <ul className="mt-4 space-y-2">
            <li><Link href="/account" className="hover:text-white">My account &amp; orders</Link></li>
            <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact us</Link></li>
            <li><Link href="/shipping-policy" className="hover:text-white">Shipping &amp; delivery</Link></li>
            <li><Link href="/returns-policy" className="hover:text-white">Returns &amp; refunds</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-white">Privacy policy</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms of sale</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-bone/60">© {new Date().getFullYear()} {STORE.legalName}. All rights reserved. Secure UPI payments.</div>
    </footer>
  );
}
