import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import ProductForm from '@/components/ProductForm';
import { archiveProductAction, saveVariantAction, updateProductAction } from '../../actions';

type V = { id?: string; sku?: string; label?: string; packQty?: number; mrpPaise?: number; pricePaise?: number; stock?: number; shippingPaise?: number };

function VariantForm({ productId, v, submit }: { productId: string; v?: V; submit: string }) {
  const n = (name: string, label: string, val: number | string | undefined, step = '1') => (<div><label className="label" htmlFor={`${name}-${v?.id ?? 'new'}`}>{label}</label><input id={`${name}-${v?.id ?? 'new'}`} name={name} defaultValue={val} step={step} type={name === 'sku' || name === 'label' ? 'text' : 'number'} required className="field !py-2" /></div>);
  return (
    <form action={saveVariantAction.bind(null, productId, v?.id ?? null)} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-4">
      {n('sku', 'SKU', v?.sku)}{n('label', 'Label (size / pack)', v?.label)}{n('packQty', 'Pack qty', v?.packQty ?? 1)}{n('stock', 'Stock', v?.stock ?? 0)}
      {n('mrpRupees', 'MRP (₹)', v?.mrpPaise !== undefined ? v.mrpPaise / 100 : undefined, '0.01')}{n('priceRupees', 'Selling price (₹, incl. GST)', v?.pricePaise !== undefined ? v.pricePaise / 100 : undefined, '0.01')}{n('shippingRupees', 'Delivery charge per unit (₹)', v?.shippingPaise !== undefined ? v.shippingPaise / 100 : 0, '0.01')}
      <div className="flex items-end"><button className="btn btn-primary w-full !py-2">{submit}</button></div>
    </form>
  );
}

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { error, saved } = await searchParams;
  const [p, categories] = await Promise.all([prisma.product.findUnique({ where: { id }, include: { variants: { orderBy: { pricePaise: 'asc' } } } }), prisma.category.findMany({ orderBy: { sortOrder: 'asc' } })]);
  if (!p) notFound();
  return (
    <div className="max-w-4xl">
      <Link href="/admin/products" className="text-sm text-brand-dark underline">← Products</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold">{p.name}</h1>
      {saved && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">Saved.</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      <div className="mt-6"><ProductForm action={updateProductAction.bind(null, p.id)} categories={categories} p={p} submit="Save product" /></div>
      <h2 className="mt-12 font-display text-3xl font-semibold">Sizes / packs</h2>
      <p className="text-sm text-ink/60">Each variant has its own price, stock and delivery charge. Use a pack quantity of 2 for “Set of 2” listings.</p>
      <div className="mt-4 space-y-3">{p.variants.map((v) => <VariantForm key={v.id} productId={p.id} v={v} submit="Update" />)}</div>
      <h3 className="mt-8 font-display text-2xl font-semibold">Add a variant</h3>
      <div className="mt-3"><VariantForm productId={p.id} submit="Add variant" /></div>
      <section className="mt-12 rounded-2xl border border-red-200 p-5 text-sm">
        <h2 className="font-display text-2xl font-semibold">{p.deletedAt ? 'Archived' : 'Archive product'}</h2>
        <p className="mt-1 text-ink/70">{p.deletedAt ? `Archived on ${p.deletedAt.toLocaleDateString('en-IN')}. It is hidden from the shop but kept for past orders and invoices.` : 'Removes the product from the shop, search and sitemap. Past orders and invoices keep working. You can restore it later.'}</p>
        <form action={archiveProductAction.bind(null, p.id, !p.deletedAt)} className="mt-3"><button className={`btn ${p.deletedAt ? 'btn-primary' : 'btn-ghost !border-red-700 !text-red-700 hover:!bg-red-700 hover:!text-white'}`}>{p.deletedAt ? 'Restore product' : 'Archive product'}</button></form>
      </section>
    </div>
  );
}
