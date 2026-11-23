import 'server-only';
import { prisma } from './db';
import { sendEmail, sendFlowSms, sendWhatsAppTemplate } from './messaging';
import { formatINR } from '@/lib/money';
import { STATUS_LABEL, type Status } from '@/lib/order-status';
import { abs } from '@/lib/seo';
import { STORE } from '@/config/store';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const MESSAGES: Partial<Record<Status, (ref: string) => string>> = {
  PAID: (ref) => `Thank you! We have received your payment for order ${ref}. We will update you when it ships.`,
  SHIPPED: (ref) => `Good news: your Raazwood order ${ref} has been shipped.`,
  DELIVERED: (ref) => `Your Raazwood order ${ref} has been delivered. We hope you love it!`,
  CANCELLED: (ref) => `Your Raazwood order ${ref} has been cancelled. If you paid, the refund will follow our refund policy.`,
  REFUNDED: (ref) => `The refund for your Raazwood order ${ref} has been issued. It can take 5-7 working days to reach your account.`,
};

/**
 * Order confirmation and status updates on every configured channel (email, SMS, WhatsApp). Runs after the
 * database change is committed and never throws: a failed message must not undo a paid order.
 */
export async function notifyOrderStatus(orderId: string, status: Status): Promise<void> {
  const make = MESSAGES[status];
  if (!make) return;
  try {
    const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o) return;
    const ref = o.publicId.slice(0, 10);
    const text = make(ref);
    const link = abs(`/order/${o.publicId}`);
    const jobs: Promise<unknown>[] = [
      sendFlowSms(o.phone, { name: o.customerName.split(' ')[0], order: ref, status: STATUS_LABEL[status] }, `${text} Track: ${link}`),
      sendWhatsAppTemplate(o.phone, [o.customerName.split(' ')[0], ref, STATUS_LABEL[status], link], `${text}\n${link}`),
    ];
    if (o.email) {
      const items = o.items.map((i) => `<tr><td>${esc(i.productName)} (${esc(i.variantLabel)}) × ${i.qty}</td><td align="right">${formatINR(i.lineTotalPaise)}</td></tr>`).join('');
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#2B2118">
<h2 style="color:#7A5F3E">${esc(STORE.name)}: order ${STATUS_LABEL[status].toLowerCase()}</h2>
<p>Hello ${esc(o.customerName)},</p><p>${esc(text)}</p>
<table width="100%" cellpadding="6" style="border-collapse:collapse;font-size:14px">${items}
${o.discountPaise ? `<tr><td>Coupon ${esc(o.couponCode ?? '')}</td><td align="right">-${formatINR(o.discountPaise)}</td></tr>` : ''}
<tr><td>Delivery</td><td align="right">${o.shippingPaise ? formatINR(o.shippingPaise) : 'Free'}</td></tr>
<tr><td><b>Total (incl. GST)</b></td><td align="right"><b>${formatINR(o.totalPaise)}</b></td></tr></table>
<p><a href="${link}" style="color:#7A5F3E">View your order</a></p>
<p style="font-size:12px;color:#777">${esc(STORE.legalName)} · ${esc(STORE.phone)}</p></div>`;
      jobs.push(sendEmail(o.email, `${STORE.name} order ${ref}: ${STATUS_LABEL[status]}`, html, `${text}\n\nView your order: ${link}`));
    }
    await Promise.allSettled(jobs);
  } catch (e) {
    console.error('notifyOrderStatus failed', e);
  }
}
