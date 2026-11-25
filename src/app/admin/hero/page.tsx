import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { getHeroSettings } from '@/server/hero';
import { HERO_MODES, MAX_SLIDES, effectiveMode } from '@/lib/hero';
import { Field, Flash } from '@/components/AdminUi';
import HeroUploader from '@/components/HeroUploader';
import { deleteSlideAction, moveSlideAction, saveHeroSettingsAction, updateSlideAction } from '../manage-actions';

type Slide = { id: string; imageId: string; title: string; subtitle: string; linkUrl: string | null; isActive: boolean; image: { width: number; height: number; bytes: number } };

function SlideList({ slides, kind }: { slides: Slide[]; kind: 'PRODUCT' | 'BANNER' }) {
  if (slides.length === 0) return <p className="mt-3 text-sm text-ink/60">No images yet. Upload below.</p>;
  return (
    <ul className="mt-4 space-y-4">
      {slides.map((s, n) => (
        <li key={s.id} className="rounded-2xl bg-white p-4 ring-1 ring-line/70">
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded image */}
              <img src={`/media/${s.imageId}?s=sm`} alt={s.title || 'Hero image'} className={`aspect-[16/9] w-full rounded-lg object-cover ring-1 ring-line ${s.isActive ? '' : 'opacity-50 grayscale'}`} />
              <p className="mt-1 text-xs text-ink/50">{s.image.width}×{s.image.height} · {Math.round(s.image.bytes / 1024)} KB · {s.isActive ? 'showing' : 'hidden'}</p>
              <div className="mt-2 flex gap-2">
                <form action={moveSlideAction.bind(null, s.id, 'up')}><button className="btn btn-ghost !px-3 !py-1" disabled={n === 0} aria-label="Move earlier">↑</button></form>
                <form action={moveSlideAction.bind(null, s.id, 'down')}><button className="btn btn-ghost !px-3 !py-1" disabled={n === slides.length - 1} aria-label="Move later">↓</button></form>
              </div>
            </div>
            <form action={updateSlideAction.bind(null, s.id)} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field name="title" label={kind === 'PRODUCT' ? 'Product name (shown small)' : 'Banner heading (optional)'} value={s.title} max={80} />
                <Field name="subtitle" label="Sub text (optional)" value={s.subtitle} max={160} />
              </div>
              <Field name="link" label={kind === 'PRODUCT' ? 'Link when clicked (optional)' : 'Banner link (optional)'} value={s.linkUrl ?? ''} max={500} placeholder="/c/beds  or  https://…" hint="A page on this site such as /product/your-bed-slug, or a full https:// link." />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={s.isActive} /> Show this image on the homepage</label>
              <div className="flex gap-3"><button className="btn btn-primary">Save</button></div>
            </form>
          </div>
          <form action={deleteSlideAction.bind(null, s.id)} className="mt-3 border-t border-line pt-3"><button className="text-sm text-red-700 underline">Delete this image</button></form>
        </li>
      ))}
    </ul>
  );
}

export default async function HeroAdmin({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireAdmin();
  const { error, saved } = await searchParams;
  const [settings, slides] = await Promise.all([
    getHeroSettings(),
    prisma.heroSlide.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true, kind: true, imageId: true, title: true, subtitle: true, linkUrl: true, isActive: true, image: { select: { width: true, height: true, bytes: true } } } }),
  ]);
  const products = slides.filter((s) => s.kind === 'PRODUCT');
  const banners = slides.filter((s) => s.kind === 'BANNER');
  const activeFor = (m: string) => (m === 'PRODUCTS' ? products : m === 'BANNER' ? banners : []).filter((s) => s.isActive).length;
  const live = effectiveMode(settings.mode, activeFor(settings.mode));

  return (
    <div className="max-w-4xl">
      <h1 className="font-display">Homepage hero</h1>
      <p className="mt-1 text-sm text-ink/60">Choose what visitors see at the very top of the homepage, and upload the pictures for it.</p>
      <Flash saved={saved} error={error} />
      {live !== settings.mode && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">“{HERO_MODES.find((m) => m.key === settings.mode)?.label}” is selected, but it has no visible image yet, so visitors currently see the table animation. Upload at least one image below.</p>}

      <form action={saveHeroSettingsAction} className="mt-6 space-y-5 rounded-2xl bg-white p-6 ring-1 ring-line/70">
        <fieldset>
          <legend className="text-sm font-semibold">What should the top of the homepage show?</legend>
          <div className="mt-3 space-y-2">
            {HERO_MODES.map((m) => (
              <label key={m.key} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${settings.mode === m.key ? 'border-brand-dark bg-bone' : 'border-line'}`}>
                <input type="radio" name="mode" value={m.key} defaultChecked={settings.mode === m.key} className="mt-1" />
                <span><span className="block font-semibold">{m.label}</span><span className="block text-ink/65">{m.help}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="headline" label="Main heading" value={settings.headline} max={120} hint="Shown on the photo hero. With a banner it is kept for Google but hidden." />
          <Field name="subline" label="Short line under the heading" value={settings.subline} max={220} />
          <Field name="ctaLabel" label="Button text" value={settings.ctaLabel} max={30} />
          <Field name="ctaHref" label="Button link" value={settings.ctaHref} max={500} hint="/shop or /c/beds, or a full https:// link" />
        </div>
        <button className="btn btn-primary">Save hero settings</button>
      </form>

      <section className="mt-10" aria-labelledby="p-h">
        <h2 id="p-h">Product photos <span className="text-sm font-normal text-ink/50">({products.length}/{MAX_SLIDES}) · for “Product photo animation”</span></h2>
        <p className="mt-1 text-sm text-ink/60">Use 4–5 of your best, bright product photos (a room setting works well). They fade into each other with a slow zoom. Best shape: landscape, around 1920×1080.</p>
        <SlideList slides={products} kind="PRODUCT" />
        <div className="mt-4"><HeroUploader kind="PRODUCT" slotsLeft={MAX_SLIDES - products.length} label="Upload product photos" /></div>
      </section>

      <section className="mt-12" aria-labelledby="b-h">
        <h2 id="b-h">Banners <span className="text-sm font-normal text-ink/50">({banners.length}/{MAX_SLIDES}) · for “Promotional banner”</span></h2>
        <p className="mt-1 text-sm text-ink/60">Sale or festival banners. Best shape: wide, around 1920×820. On phones the banner is cropped from the centre, so keep text and the main subject in the middle. Add a link to send visitors to a category or product.</p>
        <SlideList slides={banners} kind="BANNER" />
        <div className="mt-4"><HeroUploader kind="BANNER" slotsLeft={MAX_SLIDES - banners.length} label="Upload banner" /></div>
      </section>
    </div>
  );
}
