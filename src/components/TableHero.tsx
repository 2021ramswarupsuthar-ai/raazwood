'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Table geometry in px (design units; the whole rig is scaled to fit the screen).
const W = 640, D = 360, T = 30, LEG = 34, LH = 220, INSET = 30;
const LX = W / 2 - INSET - LEG / 2;
const LZ = D / 2 - INSET - LEG / 2;

type Face = { cls: string; w: number; h: number; t: string };

function Box({ x, y, z, faces }: { x: number; y: number; z: number; faces: Face[] }) {
  return (
    <div className="box" style={{ transform: `translate3d(${x}px, ${y}px, ${z}px)` }}>
      {faces.map((f, i) => (
        <div key={i} className={`face ${f.cls}`} style={{ width: f.w, height: f.h, left: -f.w / 2, top: -f.h / 2, transform: f.t }} />
      ))}
    </div>
  );
}

function Leg({ x, z }: { x: number; z: number }) {
  const y = T / 2 + LH / 2;
  return (
    <Box
      x={x} y={y} z={z}
      faces={[
        { cls: 'wood-leg-a', w: LEG, h: LH, t: `translateZ(${LEG / 2}px)` },
        { cls: 'wood-leg-b', w: LEG, h: LH, t: `rotateY(180deg) translateZ(${LEG / 2}px)` },
        { cls: 'wood-leg-b', w: LEG, h: LH, t: `rotateY(90deg) translateZ(${LEG / 2}px)` },
        { cls: 'wood-leg-a', w: LEG, h: LH, t: `rotateY(-90deg) translateZ(${LEG / 2}px)` },
      ]}
    />
  );
}

/**
 * Scroll-driven hero. Stage 1: top view of a sheesham table with the logo engraved on it.
 * Stage 2 (scroll): the camera tilts and the table turns into a 3D front view, copy fades in.
 * Stage 3: the hero un-pins and the next section scrolls in.
 * Pure CSS 3D + GSAP ScrollTrigger (no heavy 3D library). The h1/CTA are real HTML text for SEO.
 * Reduced-motion / low-end devices get a static front view with no pinning.
 */
export default function TableHero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let revert: (() => void) | undefined;
    let cancelled = false;

    const fit = () => {
      const s = Math.min(1.1, (el.clientWidth - 24) / (W + 120), (el.clientHeight * 0.78) / (D + 120));
      el.style.setProperty('--s', String(Math.max(0.38, s)));
    };

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      fit();
      window.addEventListener('resize', fit);

      const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
      const lite = window.matchMedia('(prefers-reduced-motion: reduce)').matches || (nav.deviceMemory ?? 8) <= 1 || nav.connection?.saveData === true;

      const ctx = gsap.context(() => {
        if (lite) {
          gsap.set('.t3d', { rotationX: -16, rotationY: -32, y: -105 });
          gsap.set('.floor-shadow', { opacity: 1 });
          return;
        }
        gsap.set('.t3d', { rotationX: -90, rotationY: 0, y: 0 });
        gsap.set('.floor-shadow', { opacity: 0 });
        gsap.set('.hero-copy', { opacity: 0, y: 40 });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: 'top top', end: '+=210%', pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true },
        });
        tl.to('.hero-hint', { opacity: 0, duration: 0.12 }, 0)
          .to('.t3d', { rotationX: -16, rotationY: -32, y: -125, ease: 'none', duration: 1 }, 0)
          .to('.floor-shadow', { opacity: 1, duration: 0.5 }, 0.35)
          .to('.hero-copy', { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.6)
          .to('.t3d', { rotationY: -26, duration: 0.25, ease: 'none' }, 1);
      }, el);
      revert = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('resize', fit);
      revert?.();
    };
  }, []);

  return (
    <section ref={root} className="hero-bg relative h-[100svh] min-h-[560px] w-full overflow-hidden text-bone" aria-label="Raazwood solid sheesham furniture">
      <div className="stage absolute inset-0">
        {/* absolute centring: a grid/flex parent would left-align this 640px rig on narrow phones */}
        <div className="rig absolute left-1/2 top-1/2" style={{ width: W, height: D, marginLeft: -W / 2, marginTop: -D / 2 }}>
          <div className="t3d relative h-full w-full" aria-hidden="true">
            {/* floor shadow */}
            <div className="box" style={{ transform: `translate3d(0, ${T / 2 + LH}px, 0)` }}>
              <div className="face floor-shadow" style={{ width: W + 160, height: D + 160, left: -(W + 160) / 2, top: -(D + 160) / 2, transform: 'rotateX(90deg)', backfaceVisibility: 'visible' }} />
            </div>
            <Leg x={-LX} z={-LZ} /><Leg x={LX} z={-LZ} /><Leg x={-LX} z={LZ} /><Leg x={LX} z={LZ} />
            {/* table top slab */}
            <Box
              x={0} y={0} z={0}
              faces={[
                { cls: 'wood-front', w: W, h: T, t: `translateZ(${D / 2}px)` },
                { cls: 'wood-side', w: W, h: T, t: `rotateY(180deg) translateZ(${D / 2}px)` },
                { cls: 'wood-side', w: D, h: T, t: `rotateY(90deg) translateZ(${W / 2}px)` },
                { cls: 'wood-front', w: D, h: T, t: `rotateY(-90deg) translateZ(${W / 2}px)` },
              ]}
            />
            <div className="box" style={{ transform: 'translate3d(0,0,0)' }}>
              <div className="face wood-top grid place-items-center" style={{ width: W, height: D, left: -W / 2, top: -D / 2, transform: `rotateX(90deg) translateZ(${T / 2}px)`, backfaceVisibility: 'visible' }}>
                <div className="flex flex-col items-center gap-5">
                  <Image src="/brand/logo-full.png" alt="" width={1600} height={186} priority className="engrave h-auto w-[400px]" />
                  <span className="engrave-text text-[11px] font-semibold uppercase tracking-[0.42em]">Krishana Art Palace · Solid Sheesham</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="hero-hint absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-[11px] uppercase tracking-[0.35em] text-brand">
        Scroll to explore
        <span className="mx-auto mt-3 block h-8 w-px animate-pulse bg-brand" />
      </p>

      <div className="hero-copy pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-walnut via-walnut/80 to-transparent px-4 pb-10 pt-24 text-center">
        <h1 className="h-display mx-auto max-w-3xl text-4xl sm:text-5xl md:text-6xl">Solid sheesham furniture, made to last for generations</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-bone/80">Beds, sofas, dining sets and more. Delivered across India. Pay securely by UPI.</p>
        <div className="pointer-events-auto mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/shop" className="btn btn-light">Shop furniture</Link>
          <a href="#delivery" className="btn border border-brand/60 text-brand hover:bg-brand hover:text-walnut">Check delivery to my pincode</a>
        </div>
      </div>
    </section>
  );
}
