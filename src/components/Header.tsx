import Link from 'next/link';
import Logo from './Logo';
import CartButton from './CartButton';
import SearchBox from './SearchBox';
import { getCategories } from '@/server/catalog';

const FALLBACK_NAV = [
  { id: 'beds', slug: 'beds', name: 'Beds' },
  { id: 'sofas', slug: 'sofas', name: 'Sofas' },
  { id: 'dining', slug: 'dining-sets', name: 'Dining sets' },
  { id: 'wardrobes', slug: 'wardrobes', name: 'Wardrobes' },
];

export default async function Header() {
  const fromDb = await getCategories().catch(() => []);
  const cats = fromDb.length ? fromDb : FALLBACK_NAV;
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bone/90 backdrop-blur supports-[backdrop-filter]:bg-bone/75">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo className="h-7 w-auto shrink-0 sm:h-8" />
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-medium xl:flex">
          <Link href="/shop" className="hover:text-brand-dark">Shop all</Link>
          {cats.slice(0, 4).map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="hover:text-brand-dark">{c.name}</Link>
          ))}
          <Link href="/blog" className="hover:text-brand-dark">Guides</Link>
        </nav>
        <div className="flex items-center gap-2">
          <SearchBox className="hidden w-56 md:block lg:w-64" />
          <Link href="/shop" className="rounded-full px-3 py-2 text-sm font-medium hover:text-brand-dark xl:hidden">Shop</Link>
          {/* Same link for everyone: /account sends guests to the OTP login and back */}
          <Link href="/account" aria-label="My account" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-dark/40 text-brand-dark transition hover:bg-brand-dark hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
          </Link>
          <CartButton />
        </div>
      </div>
      <div className="container-x pb-3 md:hidden"><SearchBox /></div>
    </header>
  );
}
