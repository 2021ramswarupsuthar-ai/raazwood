import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';

export default async function BlogAdmin() {
  await requireAdmin();
  const posts = await prisma.blogPost.findMany({ orderBy: { updatedAt: 'desc' } });
  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between"><h1 className="font-display text-4xl font-semibold">Blog / guides</h1><Link href="/admin/blog/new" className="btn btn-primary">New article</Link></div>
      <ul className="mt-6 divide-y divide-line rounded-2xl bg-white ring-1 ring-line/70">
        {posts.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
            <span><span className="font-medium">{p.title}</span> <span className="text-ink/60">/blog/{p.slug}</span></span>
            <span className="flex items-center gap-4">
              <span className={`rounded-full px-2 py-0.5 text-xs ${p.isPublished ? 'bg-green-50 text-green-800' : 'bg-bone text-ink/70'}`}>{p.isPublished ? 'Published' : 'Draft'}</span>
              <span className="text-ink/60">{p.updatedAt.toLocaleDateString('en-IN')}</span>
              <Link href={`/admin/blog/${p.id}`} className="text-brand-dark underline">Edit</Link>
            </span>
          </li>
        ))}
        {posts.length === 0 && <li className="px-5 py-8 text-center text-ink/60">No articles yet.</li>}
      </ul>
    </div>
  );
}
