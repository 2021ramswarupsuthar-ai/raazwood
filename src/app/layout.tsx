import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import AssistantLoader from '@/components/AssistantLoader';
import CookieConsent from '@/components/CookieConsent';
import ChromeGate from '@/components/ChromeGate';
import AnnouncementBar from '@/components/AnnouncementBar';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import { CartProvider } from '@/components/cart';
import { SITE_URL, organizationJsonLd } from '@/lib/seo';
import { STORE } from '@/config/store';

const display = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display', display: 'swap' });
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const revalidate = 3600;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Raazwood | Solid Sheesham Wood Furniture Online in India', template: '%s | Raazwood' },
  description: 'Buy solid sheesham wood beds, sofas, dining sets and more online. Delivered across India. Pay securely by UPI.',
  applicationName: STORE.name,
  openGraph: { type: 'website', siteName: STORE.name, locale: 'en_IN', images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Raazwood' }] },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = { themeColor: '#1E1611', width: 'device-width', initialScale: 1 };

// Runs before paint: hides the first-visit intro for returning visitors (no flash).
const introGuard = `try{if(sessionStorage.getItem('rw_intro_seen')==='1')document.documentElement.dataset.intro='skip'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // introGuard sets data-intro on <html> before React hydrates; only this element's attributes are exempt.
    <html lang="en-IN" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introGuard }} />
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}#intro{display:none!important}`}</style>
        </noscript>
      </head>
      <body className="font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
        <CartProvider>
          <ChromeGate
            top={<><AnnouncementBar /><Header /></>}
            bottom={<Footer />}
            floating={<><AssistantLoader /><FloatingWhatsApp /><CookieConsent /></>}
          >
            {children}
          </ChromeGate>
        </CartProvider>
        <JsonLd data={organizationJsonLd()} />
      </body>
    </html>
  );
}
