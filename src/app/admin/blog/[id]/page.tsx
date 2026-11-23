import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { Flash } from '@/components/AdminUi';
import BlogForm from '@/components/BlogForm';
import { deleteBlogAction, saveBlogAction } from '../../manage-actions';

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireAdmin();
  const [{ id }, { error, saved }] = await Promise.all([params, searchParams]);
  const p = await prisma.blogPost.findUnique({ where: { id } });
  if (!p) notFound();
  return (
    <div className="max-w-4xl">
      <Link href="/admin/blog" className="text-sm text-brand-dark underline">← Blog</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold">{p.title}</h1>
      {p.isPublished && <p className="mt-1 text-sm"><Link href={`/blog/${p.slug}`} target="_blank" className="text-brand-dark underline">View on site</Link></p>}
      <Flash saved={saved} error={error} />
      <div className="mt-6"><BlogForm action={saveBlogAction.bind(null, p.id)} b={p} submit="Save article" /></div>
      <form action={deleteBlogAction.bind(null, p.id)} className="mt-6"><button className="text-sm text-red-700 underline">Delete this article permanently</button></form>
    </div>
  );
}
