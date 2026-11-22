'use client';
import { useState } from 'react';
import Image from 'next/image';

export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const list = images.length ? images : ['/images/placeholder.svg'];
  const [i, setI] = useState(0);
  const src = list[i];
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/70">
        <Image src={src} alt={`${alt} (image ${i + 1} of ${list.length})`} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" unoptimized={src.endsWith('.svg')} />
      </div>
      {list.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {list.map((s, idx) => (
            <li key={s + idx}>
              <button type="button" onClick={() => setI(idx)} aria-label={`Show image ${idx + 1}`} aria-current={idx === i} className={`relative block aspect-square w-full overflow-hidden rounded-lg ring-2 ${idx === i ? 'ring-brand-dark' : 'ring-transparent'}`}>
                <Image src={s} alt="" fill sizes="100px" className="object-cover" unoptimized={s.endsWith('.svg')} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
