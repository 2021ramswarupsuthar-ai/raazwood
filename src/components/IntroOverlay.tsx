'use client';
import { useEffect, useRef } from 'react';

// Wordmark layout measured from the logo file (5354 px wide): used to place the pieces exactly.
const W = 5354;
const pct = (n: number) => `${(n / W) * 100}%`;
const PARTS = {
  icon: { src: '/brand/part-icon.png', left: 0, width: 539 },
  text: { src: '/brand/part-text.png', left: 690, width: 3128 },
  oo: { src: '/brand/part-oo.png', left: 3831, width: 932 },
  d: { src: '/brand/part-d.png', left: 4856, width: 498 },
};

export const INTRO_KEY = 'rw_intro_seen';

/**
 * First-visit logo animation: an infinity loop draws itself, then settles into the two "O"s of RAAZWOOD
 * while the rest of the logo assembles. Plays once per session, can be skipped, never blocks content for
 * crawlers (the page underneath is fully rendered), and is skipped for reduced-motion users.
 */
export default function IntroOverlay() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const finish = () => {
      try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* ignore */ }
      document.documentElement.dataset.intro = 'skip';
      document.documentElement.style.overflow = '';
    };
    let seen = false;
    try { seen = sessionStorage.getItem(INTRO_KEY) === '1'; } catch { /* ignore */ }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen || reduce) { finish(); return; }

    document.documentElement.style.overflow = 'hidden';
    let tl: { progress: (n?: number) => unknown; kill: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const { gsap } = await import('gsap');
      if (cancelled) return;
      const q = (s: string) => el.querySelector<HTMLElement>(s)!;
      const path = el.querySelector<SVGPathElement>('.inf-path')!;
      const len = path.getTotalLength();
      const oo = q('.p-oo');
      const inf = q('.inf');

      gsap.set(['.p-icon', '.p-text', '.p-oo', '.p-d'], { opacity: 0 });
      gsap.set('.p-icon', { clipPath: 'inset(100% 0% 0% 0%)', opacity: 1 });
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set(inf, { opacity: 1, scale: 1.6 });

      // measure where the infinity must land (over the "OO" piece)
      const ooRect = oo.getBoundingClientRect();
      const infRect = inf.getBoundingClientRect();
      const scaleTo = (ooRect.width / infRect.width) * 1.6;
      const dx = ooRect.left + ooRect.width / 2 - (infRect.left + infRect.width / 2);
      const dy = ooRect.top + ooRect.height / 2 - (infRect.top + infRect.height / 2);

      const t = gsap.timeline({ onComplete: () => { gsap.to(el, { opacity: 0, duration: 0.6, onComplete: finish }); } });
      t.to(path, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' })
        .to(path, { filter: 'drop-shadow(0 0 10px rgba(171,141,105,.9))', duration: 0.3 }, '-=0.2')
        .to(inf, { x: dx, y: dy, scale: scaleTo, duration: 0.9, ease: 'power3.inOut' }, '+=0.1')
        .to('.p-icon', { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power2.out' }, '<')
        .fromTo('.p-text', { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '<0.15')
        .fromTo('.p-d', { x: 50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '<')
        .to(oo, { opacity: 1, duration: 0.5 }, '-=0.35')
        .to(inf, { opacity: 0, duration: 0.4 }, '<')
        .to('.intro-logo', { scale: 1.04, duration: 0.9, ease: 'sine.inOut' }, '+=0.15');
      tl = t;
    })();

    return () => { cancelled = true; tl?.kill(); document.documentElement.style.overflow = ''; };
  }, []);

  const skip = () => {
    const el = root.current;
    if (!el) return;
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* ignore */ }
    el.style.transition = 'opacity .35s';
    el.style.opacity = '0';
    setTimeout(() => { document.documentElement.dataset.intro = 'skip'; document.documentElement.style.overflow = ''; }, 350);
  };

  return (
    <div id="intro" ref={root} className="fixed inset-0 z-[100] grid place-items-center bg-walnut" role="presentation">
      <div className="intro-logo relative aspect-[5354/622] w-[min(88vw,860px)]">
        {(Object.keys(PARTS) as (keyof typeof PARTS)[]).map((k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={PARTS[k].src} alt="" className={`p-${k} absolute top-0 h-full`} style={{ left: pct(PARTS[k].left), width: pct(PARTS[k].width) }} />
        ))}
      </div>
      <svg className="inf pointer-events-none absolute left-1/2 top-1/2 w-[min(70vw,420px)] -translate-x-1/2 -translate-y-1/2 opacity-0" viewBox="0 0 200 100" fill="none" aria-hidden="true">
        <path className="inf-path" d="M20 50C20 20 70 20 100 50C130 80 180 80 180 50C180 20 130 20 100 50C70 80 20 80 20 50Z" stroke="#AB8D69" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <button type="button" onClick={skip} className="absolute bottom-6 right-6 rounded-full border border-brand/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-brand hover:bg-brand hover:text-walnut">Skip</button>
    </div>
  );
}
