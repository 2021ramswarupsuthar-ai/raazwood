'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export type CarouselSlide = { id: string; imageId: string; width: number; height: number; title: string; subtitle: string; linkUrl: string | null; alt: string };
type Props = {
  variant: 'products' | 'banner';
  slides: CarouselSlide[];
  headline: string;
  subline: string;
  ctaLabel: string;
  ctaHref: string;
};

const isExternal = (u: string) => /^https:\/\//i.test(u);

/**
 * Homepage hero driven from Admin > Homepage hero.
 *  - "products": dark full-width hero, your photos cross-fade with a slow zoom behind a real-text headline + button.
 *  - "banner": full-width promotional banner(s); a slide with a link is clickable. The headline stays in the page
 *    for search engines and screen readers but is hidden visually (the banner image carries the message).
 * Images are served in two sizes (900 px for phones, 2000 px for desktop) and fitted to the box by cropping from
 * the centre, so any photo shape works. Autoplay stops for reduced-motion users, on hover/focus and in hidden tabs.
 */
export default function HeroCarousel({ variant, slides, headline, subline, ctaLabel, ctaHref }: Props) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const box = useRef<HTMLElement>(null);
  const n = slides.length;
  const go = useCallback((to: number) => setI(((to % n) + n) % n), [n]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => { mq.removeEventListener('change', onChange); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // pause when scrolled out of view
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && !document.hidden), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (n < 2 || paused || reduced || !visible) return;
    const t = setTimeout(() => go(i + 1), variant === 'products' ? 6500 : 5500);
    return () => clearTimeout(t);
  }, [i, n, paused, reduced, visible, go, variant]);

  const frame = variant === 'products' ? 'min-h-[78svh] sm:min-h-[84svh]' : 'aspect-[4/3] sm:aspect-[16/7] max-h-[680px]';

  const img = (s: CarouselSlide, idx: number) => (
    // eslint-disable-next-line @next/next/no-img-element -- already resized server-side, served with a 1-year cache
    <img
      src={`/media/${s.imageId}`}
      srcSet={`/media/${s.imageId}?s=sm 900w, /media/${s.imageId} 2000w`}
      sizes="100vw"
      width={s.width}
      height={s.height}
      alt={s.alt}
      loading={idx === 0 ? 'eager' : 'lazy'}
      fetchPriority={idx === 0 ? 'high' : 'auto'}
      decoding="async"
      className={`absolute inset-0 h-full w-full object-cover ${variant === 'products' && idx === i && !reduced ? 'hero-zoom' : ''}`}
    />
  );

  return (
    <section
      ref={box}
      aria-roledescription="carousel"
      aria-label={variant === 'products' ? 'Featured furniture' : 'Offers and announcements'}
      className={`relative isolate overflow-hidden bg-walnut ${frame}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((s, idx) => {
        const active = idx === i;
        const body = (
          <>
            {img(s, idx)}
            {variant === 'products' && <div className="absolute inset-0 bg-gradient-to-t from-walnut/90 via-walnut/45 to-walnut/25" />}
            {variant === 'banner' && (s.title || s.subtitle) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-walnut/80 to-transparent p-5 pb-10 text-bone sm:p-10 sm:pb-12">
                {s.title && <p className="font-display text-3xl font-semibold sm:text-5xl">{s.title}</p>}
                {s.subtitle && <p className="mt-1 max-w-2xl text-sm text-bone/85 sm:text-lg">{s.subtitle}</p>}
              </div>
            )}
          </>
        );
        return (
          <div key={s.id} aria-hidden={!active} role="group" aria-roledescription="slide" aria-label={`${idx + 1} of ${n}`} className={`absolute inset-0 transition-opacity duration-1000 ${active ? 'z-10 opacity-100' : 'pointer-events-none opacity-0'}`}>
            {variant === 'banner' && s.linkUrl ? (
              isExternal(s.linkUrl)
                ? <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" tabIndex={active ? 0 : -1} aria-label={s.title || s.alt} className="absolute inset-0 block">{body}</a>
                : <Link href={s.linkUrl} tabIndex={active ? 0 : -1} aria-label={s.title || s.alt} className="absolute inset-0 block">{body}</Link>
            ) : body}
          </div>
        );
      })}

      {variant === 'products' ? (
        <div className="container-x relative z-20 flex min-h-[inherit] flex-col justify-end pb-24 pt-32 text-bone sm:pb-28">
          <p className="eyebrow !text-brand">Raazwood · Krishana Art Palace</p>
          <h1 className="h-display mt-3 max-w-3xl text-4xl sm:text-5xl md:text-6xl">{headline}</h1>
          <p className="mt-4 max-w-xl text-base text-bone/85 sm:text-lg">{subline}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {isExternal(ctaHref) ? <a href={ctaHref} className="btn btn-light">{ctaLabel}</a> : <Link href={ctaHref} className="btn btn-light">{ctaLabel}</Link>}
            <Link href="/#delivery" className="btn !border !border-bone/40 text-bone hover:bg-white/10">Check delivery</Link>
          </div>
          {slides[i]?.title && <p className="mt-6 text-sm text-bone/70" aria-live="polite">Shown: {slides[i].linkUrl ? <Link href={slides[i].linkUrl!} className="underline decoration-brand underline-offset-4 hover:text-brand">{slides[i].title}</Link> : slides[i].title}</p>}
        </div>
      ) : (
        <h1 className="sr-only">{headline}</h1>
      )}

      {n > 1 && (
        <div className="absolute inset-x-0 bottom-4 z-30 flex items-center justify-center gap-3">
          <button type="button" onClick={() => go(i - 1)} aria-label="Previous slide" className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-bone backdrop-blur transition hover:bg-black/55">‹</button>
          <div className="flex gap-2" role="tablist" aria-label="Choose slide">
            {slides.map((s, idx) => (
              <button key={s.id} type="button" role="tab" aria-selected={idx === i} aria-label={`Slide ${idx + 1}`} onClick={() => go(idx)} className={`h-2.5 rounded-full transition-all ${idx === i ? 'w-8 bg-brand' : 'w-2.5 bg-bone/50 hover:bg-bone/80'}`} />
            ))}
          </div>
          <button type="button" onClick={() => go(i + 1)} aria-label="Next slide" className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-bone backdrop-blur transition hover:bg-black/55">›</button>
        </div>
      )}
    </section>
  );
}
