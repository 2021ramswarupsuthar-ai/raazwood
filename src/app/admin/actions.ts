'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/server/db';
import { loginAdmin, logoutAdmin, requireAdmin } from '@/server/admin-auth';
import { clientIp, limiters } from '@/server/http';
import { headers } from 'next/headers';
import { productFormSchema, variantFormSchema } from '@/lib/validators';
import { canTransition, type Status } from '@/lib/order-status';
import { toPaise } from '@/lib/money';
import { slugify } from '@/lib/seo';
import { audit } from '@/server/audit';
import { PLATFORMS, cleanMarketplaceUrl, type Platform } from '@/lib/marketplaces';
import { notifyOrderStatus } from '@/server/notify';

const lines = (v: FormDataEntryValue | null) => String(v ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
const bounce = (path: string, msg: string): never => redirect(`${path}?error=${encodeURIComponent(msg)}`);

export async function loginAction(formData: FormData) {
  const h = await headers();
  const ip = clientIp(new Request('http://x', { headers: h }));
  const rl = limiters.login.check(ip);
  if (!rl.ok) bounce('/admin/login', 'Too many attempts. Try again in a few minutes.');
  const ok = await loginAdmin(String(formData.get('email') ?? ''), String(formData.get('password') ?? ''));
  if (!ok) bounce('/admin/login', 'Invalid email or password.');
  redirect('/admin');
}

export async function logoutAction() {
  await logoutAdmin();
  redirect('/admin/login');
}

function parseProduct(fd: FormData) {
  const name = String(fd.get('name') ?? '');
  const raw = {
    name,
    slug: String(fd.get('slug') || slugify(name)),
    categoryId: String(fd.get('categoryId') ?? ''),
    shortDesc: String(fd.get('shortDesc') ?? ''),
    description: String(fd.get('description') ?? ''),
    material: String(fd.get('material') ?? ''),
    finish: String(fd.get('finish') ?? ''),
    dimensions: String(fd.get('dimensions') ?? ''),
    hsn: String(fd.get('hsn') ?? ''),
    gstRate: fd.get('gstRate'),
    seoTitle: String(fd.get('seoTitle') ?? '') || undefined,
    seoDesc: String(fd.get('seoDesc') ?? '') || undefined,
    isActive: fd.get('isActive') === 'on',
    isFeatured: fd.get('isFeatured') === 'on',
  };
  const parsed = productFormSchema.safeParse(raw);
  const images = lines(fd.get('images')).filter((u) => /^(https:\/\/|\/)/.test(u));
  // Platform links: a ticked platform needs a valid link for that platform; unticked platforms are removed.
  const links: { platform: Platform; url: string }[] = [];
  let linkError: string | null = null;
  for (const pl of PLATFORMS) {
    if (fd.get(`mp_${pl.key}`) !== 'on') continue;
    const url = cleanMarketplaceUrl(pl.key, String(fd.get(`mpurl_${pl.key}`) ?? ''));
    if (!url) { linkError = `${pl.label}: paste a valid ${pl.label} product link (it must be on ${pl.label}'s own website), or untick it.`; break; }
    links.push({ platform: pl.key, url });
  }
  return { parsed, images, features: lines(fd.get('features')), links, linkError };
}

/** Replace this product's platform links with exactly the ticked ones. */
async function saveLinks(productId: string, links: { platform: Platform; url: string }[]) {
  await prisma.$transaction([
    prisma.productMarketplace.deleteMany({ where: { productId, platform: { notIn: links.map((l) => l.platform) } } }),
    ...links.map((l) => prisma.productMarketplace.upsert({ where: { productId_platform: { productId, platform: l.platform } }, update: { url: l.url }, create: { productId, platform: l.platform, url: l.url } })),
  ]);
}

export async function createProductAction(fd: FormData) {
  const admin = await requireAdmin();
  const { parsed, images, features, links, linkError } = parseProduct(fd);
  if (linkError) bounce('/admin/products/new', linkError);
  if (!parsed.success) bounce('/admin/products/new', parsed.error.issues[0].path.join('.') + ': ' + parsed.error.issues[0].message);
  const d = parsed.data!;
  try {
    const p = await prisma.product.create({ data: { ...d, images, features } });
    await saveLinks(p.id, links);
    await audit(admin.email, 'product.create', 'Product', p.id, { name: p.name, slug: p.slug, platforms: links.map((l) => l.platform) });
    revalidatePath('/', 'layout');
    redirect(`/admin/products/${p.id}?saved=1`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e; // let redirect() through
    bounce('/admin/products/new', 'Could not save (is the slug already used?)');
  }
}

export async function updateProductAction(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const { parsed, images, features, links, linkError } = parseProduct(fd);
  if (linkError) bounce(`/admin/products/${id}`, linkError);
  if (!parsed.success) bounce(`/admin/products/${id}`, parsed.error.issues[0].path.join('.') + ': ' + parsed.error.issues[0].message);
  try {
    await prisma.product.update({ where: { id }, data: { ...parsed.data!, images, features } });
    await saveLinks(id, links);
    await audit(admin.email, 'product.update', 'Product', id, { name: parsed.data!.name, isActive: parsed.data!.isActive, platforms: links.map((l) => l.platform) });
  } catch {
    bounce(`/admin/products/${id}`, 'Could not save (is the slug already used?)');
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/products/${id}?saved=1`);
}

export async function saveVariantAction(productId: string, variantId: string | null, fd: FormData) {
  const admin = await requireAdmin();
  const parsed = variantFormSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) bounce(`/admin/products/${productId}`, parsed.error.issues[0].path.join('.') + ': ' + parsed.error.issues[0].message);
  const v = parsed.data!;
  if (v.priceRupees > v.mrpRupees) bounce(`/admin/products/${productId}`, 'Selling price cannot be higher than MRP');
  const data = { sku: v.sku, label: v.label, packQty: v.packQty, mrpPaise: toPaise(v.mrpRupees), pricePaise: toPaise(v.priceRupees), stock: v.stock, shippingPaise: toPaise(v.shippingRupees) };
  try {
    const before = variantId ? await prisma.variant.findUnique({ where: { id: variantId }, select: { pricePaise: true, mrpPaise: true, stock: true } }) : null;
    if (variantId) await prisma.variant.update({ where: { id: variantId }, data });
    else await prisma.variant.create({ data: { ...data, productId } });
    // price and stock changes are what the README asks to audit
    await audit(admin.email, variantId ? 'variant.update' : 'variant.create', 'Variant', variantId, { productId, sku: data.sku, before, after: { pricePaise: data.pricePaise, mrpPaise: data.mrpPaise, stock: data.stock } });
  } catch {
    bounce(`/admin/products/${productId}`, 'Could not save variant (is the SKU already used?)');
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function updateOrderStatusAction(orderId: string, to: Status) {
  const admin = await requireAdmin();
  const from = await prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o || !canTransition(o.status as Status, to)) return null;
    const r = await tx.order.updateMany({ where: { id: orderId, status: o.status }, data: { status: to } });
    if (r.count !== 1) return null;
    if (o.status === 'PENDING_PAYMENT' && to === 'CANCELLED') {
      for (const it of o.items) await tx.variant.update({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
    }
    return o.status;
  });
  if (from) {
    await audit(admin.email, 'order.status', 'Order', orderId, { from, to });
    if (from !== 'PENDING_PAYMENT') await notifyOrderStatus(orderId, to); // nothing to tell for an unpaid order
  }
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}

/** Soft delete (README §5): hidden everywhere, kept for old orders and invoices. Can be restored. */
export async function archiveProductAction(id: string, archive: boolean) {
  const admin = await requireAdmin();
  await prisma.product.update({ where: { id }, data: archive ? { deletedAt: new Date(), isActive: false } : { deletedAt: null } });
  await audit(admin.email, archive ? 'product.archive' : 'product.restore', 'Product', id);
  revalidatePath('/', 'layout');
  redirect(archive ? '/admin/products?archived=1' : `/admin/products/${id}?saved=1`);
}
