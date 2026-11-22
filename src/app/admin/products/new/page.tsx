import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import ProductForm from '@/components/ProductForm';
import { createProductAction } from '../../actions';

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-4xl font-semibold">Add product</h1>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      <p className="mt-2 text-sm text-ink/60">After saving you can add sizes / packs (variants) with price and stock.</p>
      <div className="mt-6"><ProductForm action={createProductAction} categories={categories} submit="Create product" /></div>
    </div>
  );
}
