import 'server-only';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { STORE } from '@/config/store';
import { calcTotals } from '@/lib/pricing';
import { financialYear, formatInvoiceNo } from '@/lib/invoice';
import type { CheckoutInput } from '@/lib/validators';
import { getZone } from './delivery';
import { applyCoupon } from './coupons';
import { notifyOrderStatus } from './notify';
import { manualUpi } from './payments-config';

export class OrderError extends Error {
  code: 'NOT_SERVICEABLE' | 'ITEM_UNAVAILABLE' | 'OUT_OF_STOCK' | 'NOT_FOUND' | 'COUPON_INVALID';
  missing?: string[]; // variant ids that no longer exist or are hidden (ITEM_UNAVAILABLE)
  constructor(code: OrderError['code'], message: string, missing?: string[]) {
    super(message);
    this.code = code;
    this.missing = missing;
  }
}

const newPublicId = () => randomBytes(12).toString('base64url');

function mergeItems(items: { variantId: string; qty: number }[]) {
  const m = new Map<string, number>();
  for (const it of items) m.set(it.variantId, (m.get(it.variantId) ?? 0) + it.qty);
  return [...m.entries()].map(([variantId, qty]) => ({ variantId, qty }));
}

/** Prices always come from the database, never from the browser. */
export async function quoteCart(items: { variantId: string; qty: number }[], stateCode: string, opts: { couponCode?: string | null } = {}) {
  const merged = mergeItems(items);
  const variants = await prisma.variant.findMany({
    where: { id: { in: merged.map((i) => i.variantId) }, product: { isActive: true, deletedAt: null } },
    include: { product: true },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  if (variants.length !== merged.length) {
    const missing = merged.map((i) => i.variantId).filter((id) => !byId.has(id));
    throw new OrderError('ITEM_UNAVAILABLE', 'Some items in your cart are no longer available.', missing);
  }
  const lines = merged.map((i) => {
    const v = byId.get(i.variantId)!;
    return { variantId: v.id, pricePaise: v.pricePaise, qty: i.qty, gstRate: v.product.gstRate, shippingPaise: v.shippingPaise };
  });
  const zone = await getZone(stateCode);
  const goods = lines.reduce((s, l) => s + l.pricePaise * l.qty, 0);
  const coupon = await applyCoupon(opts.couponCode, goods);
  const totals = calcTotals({
    lines,
    sellerStateCode: STORE.sellerStateCode,
    deliveryStateCode: stateCode,
    freeShippingAbovePaise: STORE.freeShippingAbovePaise,
    discountPaise: coupon && 'discountPaise' in coupon ? coupon.discountPaise : 0,
    extraShippingPaise: zone.extraShippingPaise,
  });
  return { totals, variants: byId, merged, zone, coupon };
}

export async function releaseExpiredOrders(now = new Date()): Promise<number> {
  const stale = await prisma.order.findMany({
    // manual UPI orders whose customer already sent a UTR wait for the admin instead of expiring
    where: { status: 'PENDING_PAYMENT', expiresAt: { lt: now }, utrSubmittedAt: null },
    select: { id: true },
    take: 50,
  });
  let released = 0;
  for (const { id } of stale) {
    released += await expireOne(id);
  }
  return released;
}

async function expireOne(orderId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({ where: { id: orderId, status: 'PENDING_PAYMENT', utrSubmittedAt: null }, data: { status: 'EXPIRED' } });
    if (r.count !== 1) return 0;
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const it of items) await tx.variant.update({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
    return 1;
  });
}

export async function createPendingOrder(input: CheckoutInput, opts: { customerId?: string | null; method?: 'RAZORPAY' | 'MANUAL_UPI' } = {}) {
  await releaseExpiredOrders();
  const stateCode = input.address.stateCode.toUpperCase();
  const { totals, variants, merged, zone, coupon } = await quoteCart(input.items, stateCode, { couponCode: input.couponCode });
  if (!zone.serviceable) throw new OrderError('NOT_SERVICEABLE', 'Sorry, we do not deliver to this state yet.');
  if (coupon && 'error' in coupon) throw new OrderError('COUPON_INVALID', coupon.error);

  const method = opts.method ?? 'RAZORPAY';
  const publicId = newPublicId();
  const ttlMs = method === 'MANUAL_UPI' ? manualUpi().expiryHours * 3_600_000 : STORE.orderExpiryMinutes * 60_000;
  const expiresAt = new Date(Date.now() + ttlMs);

  return prisma.$transaction(async (tx) => {
    for (const i of merged) {
      const r = await tx.variant.updateMany({ where: { id: i.variantId, stock: { gte: i.qty } }, data: { stock: { decrement: i.qty } } });
      if (r.count === 0) {
        const v = variants.get(i.variantId)!;
        throw new OrderError('OUT_OF_STOCK', `"${v.product.name} (${v.label})" is out of stock or has fewer pieces than requested.`);
      }
    }
    return tx.order.create({
      data: {
        publicId,
        customerId: opts.customerId ?? null,
        customerName: input.customer.name,
        phone: input.customer.phone.replace(/\D/g, '').slice(-10),
        email: input.customer.email || null,
        addressLine1: input.address.line1,
        addressLine2: input.address.line2 || null,
        city: input.address.city,
        stateCode,
        pincode: input.address.pincode,
        notes: input.notes || null,
        taxKind: totals.taxType,
        goodsTotalPaise: totals.goodsTotal,
        discountPaise: totals.discount,
        couponCode: totals.discount > 0 && coupon ? coupon.code : null,
        shippingPaise: totals.shipping,
        totalPaise: totals.total,
        taxablePaise: totals.tax.taxable,
        cgstPaise: totals.tax.cgst,
        sgstPaise: totals.tax.sgst,
        igstPaise: totals.tax.igst,
        paymentMethod: method,
        expiresAt,
        items: {
          create: totals.lines.map((l) => {
            const v = variants.get(l.variantId)!;
            return {
              variantId: v.id,
              productName: v.product.name,
              variantLabel: v.label,
              sku: v.sku,
              hsn: v.product.hsn,
              gstRate: v.product.gstRate,
              unitPricePaise: l.pricePaise,
              qty: l.qty,
              lineTotalPaise: l.lineTotal,
              discountPaise: l.discount,
            };
          }),
        },
      },
    });
  });
}

export async function attachRazorpayOrder(orderId: string, razorpayOrderId: string) {
  await prisma.order.update({ where: { id: orderId }, data: { razorpayOrderId } });
}

/** Cancel a still-unpaid order (e.g. payment gateway error) and give the stock back. */
export async function abandonOrder(orderId: string) {
  await expireOne(orderId);
}

export type PaidResult = 'PAID' | 'ALREADY_PAID' | 'AMOUNT_MISMATCH' | 'NOT_FOUND';
type Tx = Prisma.TransactionClient;
type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

/**
 * Shared by Razorpay and manual UPI. Handles a late payment (order already expired) by trying to re-reserve
 * stock; if that fails the order is still marked PAID with a note so the admin can fulfil or refund manually.
 */
async function finalizePaid(tx: Tx, order: OrderWithItems, pay: { provider: string; paymentId: string; amountPaise: number; raw?: unknown; razorpayPaymentId?: string }) {
  let note: string | null = null;
  if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
    let reserved = true;
    for (const it of order.items) {
      const r = await tx.variant.updateMany({ where: { id: it.variantId, stock: { gte: it.qty } }, data: { stock: { decrement: it.qty } } });
      if (r.count === 0) reserved = false;
    }
    if (!reserved) note = 'LATE PAYMENT: stock could not be re-reserved. Fulfil manually or refund.';
  }

  const now = new Date();
  const fy = financialYear(now);
  const counter = await tx.counter.upsert({
    where: { key: `invoice-${fy}` },
    update: { value: { increment: 1 } },
    create: { key: `invoice-${fy}`, value: 1 },
  });

  await tx.payment.upsert({
    where: { providerPaymentId: pay.paymentId },
    update: { status: 'captured' },
    create: { orderId: order.id, provider: pay.provider, providerPaymentId: pay.paymentId, status: 'captured', amountPaise: pay.amountPaise, raw: (pay.raw ?? {}) as Prisma.InputJsonValue },
  });
  await tx.order.update({
    where: { id: order.id },
    data: {
      status: 'PAID',
      paidAt: now,
      razorpayPaymentId: pay.razorpayPaymentId ?? order.razorpayPaymentId,
      invoiceNo: formatInvoiceNo('RW', now, counter.value),
      invoiceDate: now,
      notes: note ? [order.notes, note].filter(Boolean).join(' | ') : order.notes,
    },
  });
  if (order.couponCode) await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
}

/** Idempotent: safe to call from both the browser verify step and the webhook. */
export async function markOrderPaid(args: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
  raw?: unknown;
}): Promise<PaidResult> {
  const out = await prisma.$transaction(async (tx): Promise<{ result: PaidResult; orderId?: string }> => {
    const order = await tx.order.findUnique({ where: { razorpayOrderId: args.razorpayOrderId }, include: { items: true } });
    if (!order) return { result: 'NOT_FOUND' };
    if (args.amountPaise !== order.totalPaise) {
      await tx.payment.upsert({
        where: { providerPaymentId: args.razorpayPaymentId },
        update: {},
        create: { orderId: order.id, providerPaymentId: args.razorpayPaymentId, status: 'amount_mismatch', amountPaise: args.amountPaise, raw: (args.raw ?? {}) as Prisma.InputJsonValue },
      });
      return { result: 'AMOUNT_MISMATCH' };
    }
    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'EXPIRED' && order.status !== 'CANCELLED') return { result: 'ALREADY_PAID' };
    await finalizePaid(tx, order, { provider: 'razorpay', paymentId: args.razorpayPaymentId, amountPaise: args.amountPaise, raw: args.raw, razorpayPaymentId: args.razorpayPaymentId });
    return { result: 'PAID', orderId: order.id };
  });
  if (out.result === 'PAID' && out.orderId) await notifyOrderStatus(out.orderId, 'PAID');
  return out.result;
}

// ---------- Manual UPI fallback ----------

export type UtrResult = 'OK' | 'NOT_FOUND' | 'NOT_PENDING' | 'EXPIRED' | 'UTR_USED';

/** Customer typed the UPI reference after paying. The order now waits for the admin instead of expiring. */
export async function submitUtr(publicId: string, utr: string): Promise<UtrResult> {
  const order = await prisma.order.findUnique({ where: { publicId } });
  if (!order || order.paymentMethod !== 'MANUAL_UPI') return 'NOT_FOUND';
  if (order.status !== 'PENDING_PAYMENT') return 'NOT_PENDING';
  if (order.expiresAt < new Date() && !order.utrSubmittedAt) return 'EXPIRED';
  const clash = await prisma.order.findFirst({ where: { upiUtr: utr, NOT: { id: order.id } }, select: { id: true } });
  const usedAsPayment = await prisma.payment.findUnique({ where: { providerPaymentId: `upi:${utr}` }, select: { id: true } });
  if (clash || usedAsPayment) return 'UTR_USED';
  await prisma.order.update({ where: { id: order.id }, data: { upiUtr: utr, utrSubmittedAt: new Date() } });
  return 'OK';
}

/** Admin confirmed the money arrived in the bank account with this UTR. */
export async function confirmManualUpiPayment(orderId: string): Promise<PaidResult | 'NO_UTR' | 'UTR_USED'> {
  const out = await prisma.$transaction(async (tx): Promise<{ result: PaidResult | 'NO_UTR' | 'UTR_USED'; orderId?: string }> => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.paymentMethod !== 'MANUAL_UPI') return { result: 'NOT_FOUND' };
    if (!order.upiUtr) return { result: 'NO_UTR' };
    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'EXPIRED') return { result: 'ALREADY_PAID' };
    const dup = await tx.payment.findUnique({ where: { providerPaymentId: `upi:${order.upiUtr}` } });
    if (dup && dup.orderId !== order.id) return { result: 'UTR_USED' };
    await finalizePaid(tx, order, { provider: 'manual_upi', paymentId: `upi:${order.upiUtr}`, amountPaise: order.totalPaise, raw: { utr: order.upiUtr, verifiedManually: true } });
    return { result: 'PAID', orderId: order.id };
  });
  if (out.result === 'PAID' && out.orderId) await notifyOrderStatus(out.orderId, 'PAID');
  return out.result;
}

/** Admin could not find the payment: clear the UTR so the customer can re-check and resend it. */
export async function rejectUtr(orderId: string): Promise<boolean> {
  const r = await prisma.order.updateMany({
    where: { id: orderId, paymentMethod: 'MANUAL_UPI', status: 'PENDING_PAYMENT', upiUtr: { not: null } },
    data: { upiUtr: null, utrSubmittedAt: null, expiresAt: new Date(Date.now() + 2 * 3_600_000) },
  });
  return r.count === 1;
}

export async function getOrderByPublicId(publicId: string) {
  return prisma.order.findUnique({ where: { publicId }, include: { items: true } });
}
