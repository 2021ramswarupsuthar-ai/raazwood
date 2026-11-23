import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { Flash } from '@/components/AdminUi';
import BlogForm from '@/components/BlogForm';
import { saveBlogAction } from '../../manage-actions';

export default async function NewPost({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  return (
    <div className="max-w-4xl">
      <Link href="/admin/blog" className="text-sm text-brand-dark underline">← Blog</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold">New article</h1>
      <Flash error={error} />
      <div className="mt-6"><BlogForm action={saveBlogAction.bind(null, null)} submit="Save article" /></div>
    </div>
  );
}
