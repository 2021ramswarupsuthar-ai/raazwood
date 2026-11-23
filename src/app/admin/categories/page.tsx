import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { Field, Flash } from '@/components/AdminUi';
import { deleteCategoryAction, saveCategoryAction } from '../manage-actions';

type C = { name?: string; slug?: string; description?: string; image?: string | null; sortOrder?: number; seoTitle?: string | null; seoDesc?: string | null };

function CategoryFields({ c = {} }: { c?: C }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field name="name" label="Name" value={c.name} required max={60} />
      <Field name="slug" label="URL slug" value={c.slug} hint="Leave empty to generate. Changing it breaks old links." max={60} />
      <div className="sm:col-span-2"><label className="label" htmlFor="description">Description (shown on the category page)</label><textarea id="description" name="description" defaultValue={c.description} rows={2} maxLength={500} className="field" /></div>
      <Field name="image" label="Image URL (home page tile)" value={c.image} placeholder="https://res.cloudinary.com/…" max={500} />
      <Field name="sortOrder" label="Sort order" type="number" value={c.sortOrder ?? 0} />
      <Field name="seoTitle" label="SEO title (optional, max 70)" value={c.seoTitle} max={70} />
      <Field name="seoDesc" label="SEO description (optional, max 170)" value={c.seoDesc} max={170} />
    </div>
  );
}

export default async function Categories({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireAdmin();
  const { error, saved } = await searchParams;
  const cats = await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: true } } } });
  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-4xl font-semibold">Categories</h1>
      <Flash saved={saved} error={error} />
      <ul className="mt-6 space-y-3">
        {cats.map((c) => (
          <li key={c.id} className="rounded-2xl bg-white p-5 ring-1 ring-line/70">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span><span className="font-semibold">{c.name}</span> <span className="text-sm text-ink/60">/c/{c.slug} · {c._count.products} products · order {c.sortOrder}</span></span>
                <span className="text-sm text-brand-dark underline">Edit</span>
              </summary>
              <form action={saveCategoryAction.bind(null, c.id)} className="mt-4 space-y-4"><CategoryFields c={c} /><button className="btn btn-primary">Save category</button></form>
              {c._count.products === 0 && <form action={deleteCategoryAction.bind(null, c.id)} className="mt-3"><button className="text-sm text-red-700 underline">Delete this empty category</button></form>}
            </details>
          </li>
        ))}
      </ul>
      <section className="mt-10 rounded-2xl bg-white p-6 ring-1 ring-line/70">
        <h2 className="font-display text-2xl font-semibold">Add a category</h2>
        <form action={saveCategoryAction.bind(null, null)} className="mt-4 space-y-4"><CategoryFields /><button className="btn btn-primary">Add category</button></form>
      </section>
    </div>
  );
}
