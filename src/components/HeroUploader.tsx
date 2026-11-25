'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = { name: string; state: 'working' | 'done' | 'error'; note: string };

/** Longest side we send. Big phone photos (10+ MB) are shrunk in the browser first, then the server fits them again. */
const SEND_MAX = 2400;

async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, SEND_MAX / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/webp', 0.9));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // browser could not decode it: let the server try
  }
}

export default function HeroUploader({ kind, slotsLeft, label }: { kind: 'PRODUCT' | 'BANNER'; slotsLeft: number; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, slotsLeft);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    setItems(files.map((f) => ({ name: f.name, state: 'working', note: 'Resizing…' })));
    for (let n = 0; n < files.length; n++) {
      const set = (state: Item['state'], note: string) => setItems((prev) => prev.map((it, k) => (k === n ? { ...it, state, note } : it)));
      try {
        const blob = await shrink(files[n]);
        set('working', 'Uploading…');
        const fd = new FormData();
        fd.set('file', blob, files[n].name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg'));
        fd.set('kind', kind);
        const r = await fetch('/admin/upload', { method: 'POST', body: fd });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) set('error', d.error ?? 'Upload failed.');
        else set('done', `Added (${d.width}×${d.height}, ${d.kb} KB after fitting)`);
      } catch {
        set('error', 'Network error. Please try again.');
      }
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={slotsLeft > 1} className="sr-only" id={`up-${kind}`} onChange={onPick} disabled={busy || slotsLeft <= 0} />
      <label htmlFor={`up-${kind}`} className={`btn btn-primary cursor-pointer ${busy || slotsLeft <= 0 ? 'pointer-events-none opacity-50' : ''}`}>{busy ? 'Uploading…' : label}</label>
      <p className="mt-2 text-xs text-ink/60">{slotsLeft > 0 ? `JPG, PNG or WebP. You can add ${slotsLeft} more. Any size works: photos are shrunk, cleaned and fitted automatically.` : 'The limit is reached. Delete an image to add another.'}</p>
      {items.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm" aria-live="polite">
          {items.map((it, k) => (
            <li key={k} className={it.state === 'error' ? 'text-red-700' : it.state === 'done' ? 'text-green-800' : 'text-ink/70'}>
              <span className="font-medium">{it.name}</span>: {it.note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
