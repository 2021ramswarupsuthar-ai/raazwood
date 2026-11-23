import { cookies } from 'next/headers';
import { prisma } from '@/server/db';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth-token';
import { toCsv, type Cell } from '@/lib/csv';
import { audit } from '@/server/audit';

export const dynamic = 'force-dynamic';

const rupees = (paise: number) => (paise / 100).toFixed(2);
const istDate = (d: string, end: boolean) => new Date(`${d}T${end ? '23:59:59.999' : '00:00:00'}+05:30`);

/** README §3.2 "CSV export (orders, products)" plus customers. GET /admin/export/orders?from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const session = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!session) return new Response('Unauthorized', { status: 401 });
  const { kind } = await ctx.params;
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const range = {
    ...(from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? { gte: istDate(from, false) } : {}),
    ...(to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? { lte: istDate(to, true) } : {}),
  };

  let header: string[];
  let rows: Cell[][];
  if (kind === 'orders') {
    const orders = await prisma.order.findMany({ where: Object.keys(range).length ? { createdAt: range } : {}, include: { items: true }, orderBy: { createdAt: 'asc' }, take: 20_000 });
    header = ['created_at', 'order_ref', 'status', 'payment_method', 'invoice_no', 'invoice_date', 'customer_name', 'phone', 'email', 'city', 'state', 'pincode', 'items', 'goods_incl_gst', 'coupon', 'discount', 'shipping', 'total', 'taxable', 'cgst', 'sgst', 'igst', 'paid_at', 'razorpay_payment_id', 'upi_utr'];
    rows = orders.map((o) => [
      o.createdAt, o.publicId, o.status, o.paymentMethod, o.invoiceNo, o.invoiceDate, o.customerName, o.phone, o.email, o.city, o.stateCode, o.pincode,
      o.items.map((i) => `${i.sku} x${i.qty}`).join('; '),
      rupees(o.goodsTotalPaise), o.couponCode, rupees(o.discountPaise), rupees(o.shippingPaise), rupees(o.totalPaise), rupees(o.taxablePaise), rupees(o.cgstPaise), rupees(o.sgstPaise), rupees(o.igstPaise),
      o.paidAt, o.razorpayPaymentId, o.upiUtr,
    ]);
  } else if (kind === 'products') {
    const variants = await prisma.variant.findMany({ include: { product: { include: { category: true } } }, orderBy: [{ product: { name: 'asc' } }, { pricePaise: 'asc' }] });
    header = ['product', 'slug', 'category', 'sku', 'variant', 'pack_qty', 'mrp', 'price_incl_gst', 'stock', 'delivery_per_unit', 'hsn', 'gst_rate', 'active', 'archived', 'featured'];
    rows = variants.map((v) => [v.product.name, v.product.slug, v.product.category.name, v.sku, v.label, v.packQty, rupees(v.mrpPaise), rupees(v.pricePaise), v.stock, rupees(v.shippingPaise), v.product.hsn, v.product.gstRate, v.product.isActive, Boolean(v.product.deletedAt), v.product.isFeatured]);
  } else if (kind === 'customers') {
    const customers = await prisma.customer.findMany({ include: { _count: { select: { orders: true } } }, orderBy: { createdAt: 'asc' } });
    header = ['joined', 'name', 'phone', 'email', 'orders', 'last_login'];
    rows = customers.map((c) => [c.createdAt, c.name, c.phone, c.email, c._count.orders, c.lastLoginAt]);
  } else {
    return new Response('Not found', { status: 404 });
  }

  await audit(session.email, `export.${kind}`, 'Export', null, { rows: rows.length, from, to });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(header, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="raazwood-${kind}-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
