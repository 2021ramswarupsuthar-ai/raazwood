import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-x py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="h-display mt-2 text-5xl">We could not find that page</h1>
      <p className="mt-4 text-ink/70">The page may have moved. Let us get you back to our furniture.</p>
      <div className="mt-8 flex justify-center gap-3"><Link href="/" className="btn btn-primary">Home</Link><Link href="/shop" className="btn btn-ghost">Shop</Link></div>
    </div>
  );
}
