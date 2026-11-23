import { Field } from './AdminUi';

type B = { title?: string; slug?: string; excerpt?: string; body?: string; coverImage?: string | null; seoTitle?: string | null; seoDesc?: string | null; isPublished?: boolean };

export default function BlogForm({ action, b = {}, submit }: { action: (fd: FormData) => void | Promise<void>; b?: B; submit: string }) {
  return (
    <form action={action} className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-line/70">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="title" label="Title" value={b.title} required max={120} />
        <Field name="slug" label="URL slug" value={b.slug} max={120} hint="Leave empty to generate from the title." />
        <div className="sm:col-span-2"><label className="label" htmlFor="excerpt">Excerpt (shown on the guides list, max 300)</label><textarea id="excerpt" name="excerpt" rows={2} maxLength={300} defaultValue={b.excerpt} className="field" /></div>
      </div>
      <div>
        <label className="label" htmlFor="body">Article</label>
        <textarea id="body" name="body" rows={18} defaultValue={b.body} required className="field font-mono text-sm" />
        <p className="mt-1 text-xs text-ink/50">Blank line = new paragraph. Start a line with “## ” for a heading, “### ” for a sub-heading and “- ” for a bullet point. HTML is not allowed.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="coverImage" label="Cover image URL (optional)" value={b.coverImage} max={500} placeholder="https://res.cloudinary.com/…" />
        <div />
        <Field name="seoTitle" label="SEO title (optional, max 70)" value={b.seoTitle} max={70} />
        <Field name="seoDesc" label="SEO description (optional, max 170)" value={b.seoDesc} max={170} />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublished" defaultChecked={b.isPublished ?? false} /> Published (visible on the site and in the sitemap)</label>
      <button className="btn btn-primary">{submit}</button>
    </form>
  );
}
