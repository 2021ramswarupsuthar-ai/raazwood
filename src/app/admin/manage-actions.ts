'use server';
// Admin actions for categories, coupons, reviews, blog, delivery zones and manual UPI verification.
// Every action re-checks the admin session (middleware is only the first line of defence) and is audited.
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/admin-auth';
import { audit } from '@/server/audit';
import { confirmManualUpiPayment, rejectUtr } from '@/server/orders';
import { defaultZone } from '@/server/delivery';
import { blogFormSchema, categoryFormSchema, couponFormSchema } from '@/lib/validators';
import { toPaise } from '@/lib/money';
import { slugify } from '@/lib/seo';
import { STATES } from '@/config/states';

const bounce = (path: string, msg: string): never => redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`);
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const opt = (fd: FormData, k: string) => str(fd, k) || undefined;
const isRedirect = (e: unknown) => Boolean(e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_REDIRECT'));

// ---------- Categories ----------

export async function saveCategoryAction(id: string | null, fd: FormData) {
  const admin = await requireAdmin();
  const name = str(fd, 'name');
  const parsed = categoryFormSchema.safeParse({ name, slug: str(fd, 'slug') || slugify(name), description: str(fd, 'description'), image: str(fd, 'image'), sortOrder: str(fd, 'sortOrder') || 0, seoTitle: opt(fd, 'seoTitle'), seoDesc: opt(fd, 'seoDesc') });
  if (!parsed.success) bounce('/admin/categories', `${parsed.error.issues[0].path.join('.')}: ${parsed.error.issues[0].message}`);
  const d = parsed.data!;
  const data = { ...d, image: d.image || null, seoTitle: d.seoTitle ?? null, seoDesc: d.seoDesc ?? null };
  try {
    const c = id ? await prisma.category.update({ where: { id }, data }) : await prisma.category.create({ data });
    await audit(admin.email, id ? 'category.update' : 'category.create', 'Category', c.id, { name: c.name, slug: c.slug });
  } catch {
    bounce('/admin/categories', 'Could not save (is the slug already used?)');
  }
  revalidatePath('/', 'layout');
  redirect('/admin/categories?saved=1');
}

export async function deleteCategoryAction(id: string) {
  const admin = await requireAdmin();
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) bounce('/admin/categories', `This category still has ${count} product(s), including archived ones. Move them to another category first.`);
  await prisma.category.delete({ where: { id } });
  await audit(admin.email, 'category.delete', 'Category', id);
  revalidatePath('/', 'layout');
  redirect('/admin/categories?saved=1');
}

// ---------- Coupons ----------

const toDate = (v?: string) => (v ? new Date(`${v}T00:00:00+05:30`) : null); // dates typed in IST
const toEndOfDay = (v?: string) => (v ? new Date(`${v}T23:59:59+05:30`) : null);

export async function saveCouponAction(id: string | null, fd: FormData) {
  const admin = await requireAdmin();
  const back = id ? `/admin/coupons/${id}` : '/admin/coupons';
  const parsed = couponFormSchema.safeParse({
    code: str(fd, 'code'), description: str(fd, 'description'), kind: str(fd, 'kind'), value: str(fd, 'value'),
    minOrderRupees: str(fd, 'minOrderRupees') || 0, maxDiscountRupees: opt(fd, 'maxDiscountRupees'), startsAt: opt(fd, 'startsAt'), endsAt: opt(fd, 'endsAt'),
    usageLimit: opt(fd, 'usageLimit'), isActive: fd.get('isActive') === 'on',
  });
  if (!parsed.success) bounce(back, `${parsed.error.issues[0].path.join('.')}: ${parsed.error.issues[0].message}`);
  const d = parsed.data!;
  if (d.kind === 'PERCENT' && (d.value < 1 || d.value > 90 || !Number.isInteger(d.value))) bounce(back, 'Percent coupons must be a whole number from 1 to 90.');
  const data = {
    code: d.code, description: d.description, kind: d.kind,
    value: d.kind === 'PERCENT' ? d.value : toPaise(d.value),
    minOrderPaise: toPaise(d.minOrderRupees),
    maxDiscountPaise: d.kind === 'PERCENT' && d.maxDiscountRupees ? toPaise(d.maxDiscountRupees) : null,
    startsAt: toDate(d.startsAt), endsAt: toEndOfDay(d.endsAt), usageLimit: d.usageLimit ?? null, isActive: d.isActive,
  };
  if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) bounce(back, 'End date is before the start date.');
  try {
    const c = id ? await prisma.coupon.update({ where: { id }, data }) : await prisma.coupon.create({ data });
    await audit(admin.email, id ? 'coupon.update' : 'coupon.create', 'Coupon', c.id, { code: c.code, kind: c.kind, value: c.value, isActive: c.isActive });
  } catch (e) {
    if (isRedirect(e)) throw e;
    bounce(back, 'Could not save (is the code already used?)');
  }
  redirect('/admin/coupons?saved=1');
}

// ---------- Reviews ----------

export async function moderateReviewAction(id: string, to: 'APPROVED' | 'REJECTED' | 'DELETE') {
  const admin = await requireAdmin();
  const r = await prisma.review.findUnique({ where: { id }, include: { product: { select: { slug: true } } } });
  if (!r) redirect('/admin/reviews');
  if (to === 'DELETE') await prisma.review.delete({ where: { id } });
  else await prisma.review.update({ where: { id }, data: { status: to } });
  await audit(admin.email, `review.${to.toLowerCase()}`, 'Review', id, { productSlug: r!.product.slug, rating: r!.rating });
  revalidatePath(`/product/${r!.product.slug}`);
  redirect('/admin/reviews');
}

// ---------- Blog ----------

export async function saveBlogAction(id: string | null, fd: FormData) {
  const admin = await requireAdmin();
  const back = id ? `/admin/blog/${id}` : '/admin/blog/new';
  const title = str(fd, 'title');
  const parsed = blogFormSchema.safeParse({ title, slug: str(fd, 'slug') || slugify(title), excerpt: str(fd, 'excerpt'), body: String(fd.get('body') ?? ''), coverImage: str(fd, 'coverImage'), seoTitle: opt(fd, 'seoTitle'), seoDesc: opt(fd, 'seoDesc'), isPublished: fd.get('isPublished') === 'on' });
  if (!parsed.success) bounce(back, `${parsed.error.issues[0].path.join('.')}: ${parsed.error.issues[0].message}`);
  const d = parsed.data!;
  const existing = id ? await prisma.blogPost.findUnique({ where: { id }, select: { publishedAt: true, slug: true } }) : null;
  const data = { ...d, coverImage: d.coverImage || null, seoTitle: d.seoTitle ?? null, seoDesc: d.seoDesc ?? null, publishedAt: d.isPublished ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null };
  let postId = id;
  try {
    const p = id ? await prisma.blogPost.update({ where: { id }, data }) : await prisma.blogPost.create({ data });
    postId = p.id;
    await audit(admin.email, id ? 'blog.update' : 'blog.create', 'BlogPost', p.id, { title: p.title, isPublished: p.isPublished });
  } catch {
    bounce(back, 'Could not save (is the slug already used?)');
  }
  revalidatePath('/blog');
  revalidatePath(`/blog/${d.slug}`);
  if (existing && existing.slug !== d.slug) revalidatePath(`/blog/${existing.slug}`);
  redirect(`/admin/blog/${postId}?saved=1`);
}

export async function deleteBlogAction(id: string) {
  const admin = await requireAdmin();
  const p = await prisma.blogPost.delete({ where: { id } }).catch(() => null);
  if (p) {
    await audit(admin.email, 'blog.delete', 'BlogPost', id, { title: p.title });
    revalidatePath('/blog');
    revalidatePath(`/blog/${p.slug}`);
  }
  redirect('/admin/blog');
}

// ---------- Delivery zones ----------

/**
 * One form for all states. A row that differs from the code defaults is saved; a row that matches them is
 * removed, so later changes to the defaults (store.ts / SERVICEABLE_STATES) still apply to it.
 */
export async function saveDeliveryZonesAction(fd: FormData) {
  const admin = await requireAdmin();
  const rows = STATES.map(({ code, name }) => ({
    code, name,
    min: Number(fd.get(`min_${code}`)),
    max: Number(fd.get(`max_${code}`)),
    extra: Number(fd.get(`extra_${code}`) || 0),
    serviceable: fd.get(`ok_${code}`) === 'on',
  }));
  const bad = rows.find((r) => !Number.isInteger(r.min) || !Number.isInteger(r.max) || r.min < 1 || r.max < r.min || r.max > 90 || !(r.extra >= 0 && r.extra <= 100_000));
  if (bad) bounce('/admin/delivery', `${bad.name}: delivery days must be whole numbers from 1 to 90 (min ≤ max) and the extra charge ₹0 to ₹1,00,000.`);

  const custom: string[] = [];
  const reset: string[] = [];
  for (const r of rows) {
    const d = defaultZone(r.code);
    if (r.serviceable === d.serviceable && r.min === d.minDays && r.max === d.maxDays && r.extra === 0) { reset.push(r.code); continue; }
    const data = { serviceable: r.serviceable, minDays: r.min, maxDays: r.max, extraShippingPaise: toPaise(r.extra) };
    await prisma.deliveryZone.upsert({ where: { stateCode: r.code }, update: data, create: { stateCode: r.code, ...data } });
    custom.push(r.code);
  }
  await prisma.deliveryZone.deleteMany({ where: { stateCode: { in: reset } } });
  await audit(admin.email, 'delivery.update', 'DeliveryZone', null, { custom });
  redirect('/admin/delivery?saved=1');
}

// ---------- Manual UPI ----------

export async function confirmUtrAction(orderId: string) {
  const admin = await requireAdmin();
  const r = await confirmManualUpiPayment(orderId);
  await audit(admin.email, 'payment.manual_upi.confirm', 'Order', orderId, { result: r });
  if (r !== 'PAID' && r !== 'ALREADY_PAID') bounce(`/admin/orders/${orderId}`, r === 'UTR_USED' ? 'This UTR is already recorded on another order.' : r === 'NO_UTR' ? 'The customer has not sent a UTR yet.' : 'Could not confirm this payment.');
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}

export async function rejectUtrAction(orderId: string) {
  const admin = await requireAdmin();
  const ok = await rejectUtr(orderId);
  await audit(admin.email, 'payment.manual_upi.reject', 'Order', orderId, { ok });
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}
