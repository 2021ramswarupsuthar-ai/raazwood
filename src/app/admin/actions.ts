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
  return { parsed, images, features: lines(fd.get('features')) };
}

export async function createProductAction(fd: FormData) {
  await requireAdmin();
  const { parsed, images, features } = parseProduct(fd);
  if (!parsed.success) bounce('/admin/products/new', parsed.error.issues[0].path.join('.') + ': ' + parsed.error.issues[0].message);
  const d = parsed.data!;
  try {
    const p = await prisma.product.create({ data: { ...d, images, features } });
    revalidatePath('/', 'layout');
    redirect(`/admin/products/${p.id}?saved=1`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e; // let redirect() through
    bounce('/admin/products/new', 'Could not save (is the slug already used?)');
  }
}

export async function updateProductAction(id: string, fd: FormData) {
  await requireAdmin();
  const { parsed, images, features } = parseProduct(fd);
  if (!parsed.success) bounce(`/admin/products/${id}`, parsed.error.issues[0].path.join('.') + ': ' + parsed.error.issues[0].message);
  try {
    await prisma.product.update({ where: { id }, data: { ...parsed.data!, images, features } });
  } catch {
    bounce(`/admin/products/${id}`, 'Could not save (is the slug already used?)');
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/products/${id}?saved=1`);
}

export async function saveVariantAction(productId: string, variantId: string | null, fd: FormData) {
  await requireAdmin();
  const parsed = variantFormSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) bounce(`/admin/products/${productId}`, parsed.error.issues[0].path.join('.') + ': ' + parsed.error.issues[0].message);
  const v = parsed.data!;
  if (v.priceRupees > v.mrpRupees) bounce(`/admin/products/${productId}`, 'Selling price cannot be higher than MRP');
  const data = { sku: v.sku, label: v.label, packQty: v.packQty, mrpPaise: toPaise(v.mrpRupees), pricePaise: toPaise(v.priceRupees), stock: v.stock, shippingPaise: toPaise(v.shippingRupees) };
  try {
    if (variantId) await prisma.variant.update({ where: { id: variantId }, data });
    else await prisma.variant.create({ data: { ...data, productId } });
  } catch {
    bounce(`/admin/products/${productId}`, 'Could not save variant (is the SKU already used?)');
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function updateOrderStatusAction(orderId: string, to: Status) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o || !canTransition(o.status as Status, to)) return;
    const r = await tx.order.updateMany({ where: { id: orderId, status: o.status }, data: { status: to } });
    if (r.count === 1 && o.status === 'PENDING_PAYMENT' && to === 'CANCELLED') {
      for (const it of o.items) await tx.variant.update({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
    }
  });
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}
