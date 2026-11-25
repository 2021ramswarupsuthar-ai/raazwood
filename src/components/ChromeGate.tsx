'use client';
import { usePathname } from 'next/navigation';

/**
 * Shows the storefront chrome (offer bar, header, footer, chat, cookie banner) everywhere except /admin, which
 * has its own layout. The pieces are server-rendered by the root layout and only switched here.
 */
export default function ChromeGate({ top, bottom, floating, children }: { top: React.ReactNode; bottom: React.ReactNode; floating: React.ReactNode; children: React.ReactNode }) {
  const inAdmin = (usePathname() ?? '').startsWith('/admin');
  if (inAdmin) return <main id="main">{children}</main>;
  return (
    <>
      {top}
      <main id="main">{children}</main>
      {bottom}
      {floating}
    </>
  );
}
