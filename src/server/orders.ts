import 'server-only';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { STORE } from '@/config/store';
import { calcTotals } from '@/lib/pricing';
import { isServiceable } from '@/lib/pincode';
import { financialYear, formatInvoiceNo } from '@/lib/invoice';
import type { CheckoutInput } from '@/lib/validators';

export class OrderError extends Error {
  code: 'NOT_SERVICEABLE' | 'ITEM_UNAVAILABLE' | 'OUT_OF_STOCK' | 'NOT_FOUND';
  constructor(code: OrderError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const newPublicId = () => randomBytes(12).toString('base64url');

function mergeItems(items: { variantId: string; qty: number }[]) {
  const m = new Map<string, number>();
  for (const it of items) m.set(it.variantId, (m.get(it.variantId) ?? 0) + it.qty);
  return [...m.entries()].map(([variantId, qty]) => ({ variantId, qty }));
}

/** Prices always come from the database, never from the browser. */
export async function quoteCart(items: { variantId: string; qty: number }[], stateCode: string) {
  const merged = mergeItems(items);
  const variants = await prisma.variant.findMany({
    where: { id: { in: merged.map((i) => i.variantId) }, product: { isActive: true } },
    include: { product: true },
  });
  if (variants.length !== merged.length) throw new OrderError('ITEM_UNAVAILABLE', 'Some items in your cart are no longer available.');
  const byId = new Map(variants.map((v) => [v.id, v]));
  const lines = merged.map((i) => {
    const v = byId.get(i.variantId)!;
    return { variantId: v.id, pricePaise: v.pricePaise, qty: i.qty, gstRate: v.product.gstRate, shippingPaise: v.shippingPaise };
  });
  const totals = calcTotals({
    lines,
    sellerStateCode: STORE.sellerStateCode,
    deliveryStateCode: stateCode,
    freeShippingAbovePaise: STORE.freeShippingAbovePaise,
  });
  return { totals, variants: byId, merged };
}

export async function releaseExpiredOrders(now = new Date()): Promise<number> {
  const stale = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', expiresAt: { lt: now } },
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
    const r = await tx.order.updateMany({ where: { id: orderId, status: 'PENDING_PAYMENT' }, data: { status: 'EXPIRED' } });
    if (r.count !== 1) return 0;
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const it of items) await tx.variant.update({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
    return 1;
  });
}

export async function createPendingOrder(input: CheckoutInput) {
  await releaseExpiredOrders();
  const stateCode = input.address.stateCode.toUpperCase();
  if (!isServiceable(stateCode)) throw new OrderError('NOT_SERVICEABLE', 'Sorry, we do not deliver to this state yet.');

  const { totals, variants, merged } = await quoteCart(input.items, stateCode);
  const publicId = newPublicId();
  const expiresAt = new Date(Date.now() + STORE.orderExpiryMinutes * 60_000);

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
          shippingPaise: totals.shipping,
          totalPaise: totals.total,
          taxablePaise: totals.tax.taxable,
          cgstPaise: totals.tax.cgst,
          sgstPaise: totals.tax.sgst,
          igstPaise: totals.tax.igst,
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

/**
 * Idempotent: safe to call from both the browser verify step and the webhook.
 * Handles a late payment (order already expired) by trying to re-reserve stock; if that fails the order is
 * still marked PAID with a note so the admin can fulfil or refund manually.
 */
export async function markOrderPaid(args: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
  raw?: unknown;
}): Promise<PaidResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { razorpayOrderId: args.razorpayOrderId }, include: { items: true } });
    if (!order) return 'NOT_FOUND';
    if (args.amountPaise !== order.totalPaise) {
      await tx.payment.upsert({
        where: { providerPaymentId: args.razorpayPaymentId },
        update: {},
        create: { orderId: order.id, providerPaymentId: args.razorpayPaymentId, status: 'amount_mismatch', amountPaise: args.amountPaise, raw: (args.raw ?? {}) as Prisma.InputJsonValue },
      });
      return 'AMOUNT_MISMATCH';
    }
    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'EXPIRED' && order.status !== 'CANCELLED') {
      return 'ALREADY_PAID';
    }

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
      where: { providerPaymentId: args.razorpayPaymentId },
      update: { status: 'captured' },
      create: { orderId: order.id, providerPaymentId: args.razorpayPaymentId, status: 'captured', amountPaise: args.amountPaise, raw: (args.raw ?? {}) as Prisma.InputJsonValue },
    });
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: now,
        razorpayPaymentId: args.razorpayPaymentId,
        invoiceNo: formatInvoiceNo('RW', now, counter.value),
        invoiceDate: now,
        notes: note ? [order.notes, note].filter(Boolean).join(' | ') : order.notes,
      },
    });
    return 'PAID';
  });
}

export async function getOrderByPublicId(publicId: string) {
  return prisma.order.findUnique({ where: { publicId }, include: { items: true } });
}
