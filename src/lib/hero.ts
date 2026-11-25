// Homepage hero settings (edited in Admin > Homepage hero). Pure helpers so they can be unit-tested.
export type HeroMode = 'TABLE' | 'PRODUCTS' | 'BANNER';

export type HeroSettings = {
  mode: HeroMode;
  headline: string;
  subline: string;
  ctaLabel: string;
  ctaHref: string;
};

export const HERO_MODES: { key: HeroMode; label: string; help: string }[] = [
  { key: 'TABLE', label: 'Animated wooden table (default)', help: 'The scroll animation with the table and logo. No photos needed.' },
  { key: 'PRODUCTS', label: 'Product photo animation', help: 'Your real product photos (up to 6) fade and zoom slowly behind the headline.' },
  { key: 'BANNER', label: 'Promotional banner', help: 'Full-width banner image(s) for a sale or campaign. Each can link to a page.' },
];

export const DEFAULT_HERO: HeroSettings = {
  mode: 'TABLE',
  headline: 'Solid sheesham furniture, made to last for generations',
  subline: 'Handcrafted in solid sheesham wood and delivered across India. Pay securely by UPI.',
  ctaLabel: 'Shop now',
  ctaHref: '/shop',
};

export const MAX_SLIDES = 6;

/** A link is either a path on this site ("/shop") or an https address. Anything else (javascript:, //evil) is refused. */
export function cleanHeroLink(input: string): string | null {
  const v = input.trim();
  if (!v) return '';
  if (v.length > 500) return null;
  if (v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\')) return v;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}

const clip = (v: unknown, max: number, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback);

/** Turn whatever is stored (or nothing) into complete, safe settings. */
export function normalizeHero(raw: unknown): HeroSettings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const mode = o.mode === 'PRODUCTS' || o.mode === 'BANNER' ? o.mode : 'TABLE';
  const cta = typeof o.ctaHref === 'string' ? cleanHeroLink(o.ctaHref) : null;
  return {
    mode,
    headline: clip(o.headline, 120, DEFAULT_HERO.headline),
    subline: clip(o.subline, 220, DEFAULT_HERO.subline),
    ctaLabel: clip(o.ctaLabel, 30, DEFAULT_HERO.ctaLabel),
    ctaHref: cta || DEFAULT_HERO.ctaHref,
  };
}

/** The mode that is really shown: a photo or banner mode without any active slide falls back to the table. */
export function effectiveMode(mode: HeroMode, activeSlides: number): HeroMode {
  return mode !== 'TABLE' && activeSlides === 0 ? 'TABLE' : mode;
}
