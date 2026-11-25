'use client';
import { useState } from 'react';
import Image from 'next/image';

/** Big image with hover zoom on desktop, arrows, and a thumbnail strip. */
export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const list = images.length ? images : ['/images/placeholder.svg'];
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const src = list[i];
  const go = (d: number) => setI((v) => (v + d + list.length) % list.length);
  return (
    <div>
      <div
        className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/70"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
        onMouseLeave={() => setZoom(null)}
      >
        <Image
          src={src}
          alt={`${alt} (image ${i + 1} of ${list.length})`}
          fill
          priority
          sizes="(min-width:1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-200 ease-out"
          style={zoom && !src.endsWith('.svg') ? { transform: 'scale(1.9)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          unoptimized={src.endsWith('.svg')}
        />
        {list.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous image" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg opacity-100 shadow-card transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Next image" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg opacity-100 shadow-card transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100">›</button>
            <span className="absolute bottom-3 right-3 rounded-full bg-walnut/80 px-2.5 py-1 text-xs text-bone" aria-hidden="true">{i + 1} / {list.length}</span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {list.map((s, idx) => (
            <li key={s + idx}>
              <button type="button" onClick={() => setI(idx)} aria-label={`Show image ${idx + 1}`} aria-current={idx === i} className={`relative block aspect-square w-full overflow-hidden rounded-lg ring-2 transition ${idx === i ? 'ring-brand-dark' : 'opacity-80 ring-transparent hover:opacity-100'}`}>
                <Image src={s} alt="" fill sizes="100px" className="object-cover" unoptimized={s.endsWith('.svg')} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
