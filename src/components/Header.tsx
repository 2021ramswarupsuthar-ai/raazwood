import Link from 'next/link';
import Logo from './Logo';
import CartButton from './CartButton';
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
        <Logo className="h-7 w-auto sm:h-8" />
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium lg:flex">
          <Link href="/shop" className="hover:text-brand-dark">Shop all</Link>
          {cats.slice(0, 5).map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="hover:text-brand-dark">{c.name}</Link>
          ))}
          <Link href="/contact" className="hover:text-brand-dark">Contact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/shop" className="rounded-full px-3 py-2 text-sm font-medium hover:text-brand-dark lg:hidden">Shop</Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
