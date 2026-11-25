import { PLATFORMS } from '@/lib/marketplaces';

type P = { name?: string; slug?: string; categoryId?: string; shortDesc?: string; description?: string; material?: string; finish?: string; dimensions?: string; hsn?: string; gstRate?: number; seoTitle?: string | null; seoDesc?: string | null; isActive?: boolean; isFeatured?: boolean; images?: string[]; features?: string[] };

export default function ProductForm({ action, categories, p = {}, submit, marketplaces = [] }: { action: (fd: FormData) => void | Promise<void>; categories: { id: string; name: string }[]; p?: P; submit: string; marketplaces?: { platform: string; url: string }[] }) {
  const t = (name: string, label: string, val: string | number | undefined, extra: { required?: boolean; hint?: string; max?: number } = {}) => (
    <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} defaultValue={val} required={extra.required} maxLength={extra.max} className="field" />{extra.hint && <p className="mt-1 text-xs text-ink/50">{extra.hint}</p>}</div>
  );
  return (
    <form action={action} className="space-y-5 rounded-2xl bg-white p-6 ring-1 ring-line/70">
      <div className="grid gap-4 sm:grid-cols-2">
        {t('name', 'Product name', p.name, { required: true })}
        {t('slug', 'URL slug', p.slug, { hint: 'Lowercase, hyphens. Leave empty to generate from the name. Changing it later breaks old links.' })}
        <div><label className="label" htmlFor="categoryId">Category</label><select id="categoryId" name="categoryId" defaultValue={p.categoryId} required className="field"><option value="">Select…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        {t('shortDesc', 'Short description (one line)', p.shortDesc, { max: 200 })}
        {t('material', 'Material', p.material ?? 'Solid sheesham wood')}
        {t('finish', 'Finish', p.finish)}
        {t('dimensions', 'Dimensions', p.dimensions, { hint: 'e.g. 78 x 62 x 36 in (L x W x H)' })}
        {t('hsn', 'HSN code', p.hsn ?? '9403', { required: true, hint: 'Confirm with your CA' })}
        {t('gstRate', 'GST rate %', p.gstRate ?? 18, { required: true, hint: 'Confirm with your CA' })}
      </div>
      <div><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" rows={6} defaultValue={p.description} className="field" maxLength={5000} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="features">Key features (one per line)</label><textarea id="features" name="features" rows={5} defaultValue={p.features?.join('\n')} className="field" /></div>
        <div><label className="label" htmlFor="images">Image URLs (one per line)</label><textarea id="images" name="images" rows={5} defaultValue={p.images?.join('\n')} className="field" placeholder="https://res.cloudinary.com/…" /><p className="mt-1 text-xs text-ink/50">First image is the main photo. Upload to Cloudinary and paste the https link.</p></div>
        {t('seoTitle', 'SEO title (optional, max 70)', p.seoTitle ?? '', { max: 70 })}
        {t('seoDesc', 'SEO description (optional, max 170)', p.seoDesc ?? '', { max: 170 })}
      </div>
      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Also sold on other platforms</legend>
        <p className="text-xs text-ink/60">Tick a platform if this product is also sold there and paste its link. Customers see a small “Also available on” row on the product page. Leave unticked if it is not sold there.</p>
        <div className="mt-3 space-y-3">
          {PLATFORMS.map((pl) => {
            const cur = marketplaces.find((m) => m.platform === pl.key);
            return (
              <div key={pl.key} className="grid items-center gap-2 sm:grid-cols-[150px_1fr]">
                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name={`mp_${pl.key}`} defaultChecked={Boolean(cur)} /> {pl.label}</label>
                <input name={`mpurl_${pl.key}`} defaultValue={cur?.url ?? ''} placeholder={pl.example} maxLength={600} inputMode="url" aria-label={`${pl.label} product link`} className="field" />
              </div>
            );
          })}
        </div>
      </fieldset>
      <div className="flex gap-6 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={p.isActive ?? true} /> Visible on site</label><label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" defaultChecked={p.isFeatured ?? false} /> Featured on home page</label></div>
      <button className="btn btn-primary">{submit}</button>
    </form>
  );
}
