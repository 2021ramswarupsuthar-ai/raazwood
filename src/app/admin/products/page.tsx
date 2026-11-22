import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { formatINR } from '@/lib/money';

export default async function Products() {
  await requireAdmin();
  const products = await prisma.product.findMany({ include: { category: true, variants: true }, orderBy: { createdAt: 'desc' } });
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="font-display text-4xl font-semibold">Products ({products.length})</h1><Link href="/admin/products/new" className="btn btn-primary">Add product</Link></div>
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white ring-1 ring-line/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink/60"><tr><th className="px-4 py-3">Name</th><th>Category</th><th>Variants</th><th>From</th><th>Stock</th><th>Active</th><th /></tr></thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (<tr key={p.id}><td className="px-4 py-3 font-medium">{p.name}</td><td>{p.category.name}</td><td>{p.variants.length}</td><td>{p.variants.length ? formatINR(Math.min(...p.variants.map((v) => v.pricePaise))) : '—'}</td><td>{p.variants.reduce((s, v) => s + v.stock, 0)}</td><td>{p.isActive ? 'Yes' : 'No'}</td><td className="px-4 text-right"><Link className="text-brand-dark underline" href={`/admin/products/${p.id}`}>Edit</Link></td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
