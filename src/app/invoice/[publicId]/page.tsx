import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PrintButton from '@/components/PrintButton';
import { getOrderByPublicId } from '@/server/orders';
import { formatINR } from '@/lib/money';
import { splitInclusive } from '@/lib/tax';
import { stateByCode } from '@/config/states';
import { STORE } from '@/config/store';

export const metadata: Metadata = { title: 'Tax invoice', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Invoice({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const o = await getOrderByPublicId(publicId);
  if (!o || !o.invoiceNo) notFound();
  const kind = o.taxKind;
  const buyerState = stateByCode(o.stateCode);
  const sellerState = stateByCode(STORE.sellerStateCode);
  const rows = o.items.map((it) => ({ it, s: splitInclusive(it.lineTotalPaise, it.gstRate, kind) }));

  return (
    <div className="container-x max-w-4xl py-10">
      <div className="mb-6 flex items-center justify-between print:hidden"><h1 className="font-display text-3xl font-semibold">Tax invoice</h1><PrintButton /></div>
      <article className="rounded-2xl bg-white p-8 text-sm ring-1 ring-line/70 print:rounded-none print:p-0 print:ring-0">
        <header className="flex flex-wrap justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="font-display text-2xl font-semibold">{STORE.legalName}</p>
            <p className="text-ink/70">Trading as {STORE.name}</p>
            <p className="mt-1 max-w-xs text-ink/70">{STORE.address}</p>
            <p className="mt-1">GSTIN: {STORE.gstin || '(not set)'} · State: {sellerState?.name} ({sellerState?.gst})</p>
          </div>
          <dl className="text-right">
            <div><dt className="inline text-ink/60">Invoice no: </dt><dd className="inline font-semibold">{o.invoiceNo}</dd></div>
            <div><dt className="inline text-ink/60">Date: </dt><dd className="inline">{o.invoiceDate?.toLocaleDateString('en-IN')}</dd></div>
            <div><dt className="inline text-ink/60">Order: </dt><dd className="inline font-mono text-xs">{o.publicId}</dd></div>
          </dl>
        </header>
        <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
          <div><p className="text-ink/60">Billed / shipped to</p><p className="font-semibold">{o.customerName}</p><p>{o.addressLine1}{o.addressLine2 ? `, ${o.addressLine2}` : ''}</p><p>{o.city}, {buyerState?.name} {o.pincode}</p><p>Mobile: {o.phone}</p></div>
          <div><p className="text-ink/60">Place of supply</p><p className="font-semibold">{buyerState?.name} ({buyerState?.gst})</p><p className="text-ink/60">{kind === 'INTRA' ? 'Intra-state supply (CGST + SGST)' : 'Inter-state supply (IGST)'}</p></div>
        </section>
        <div className="overflow-x-auto">
          <table className="mt-6 w-full min-w-[640px] text-left">
            <thead className="text-xs uppercase tracking-wide text-ink/60"><tr><th className="py-2">Item</th><th>HSN</th><th className="text-right">Qty</th><th className="text-right">Taxable</th><th className="text-right">GST %</th>{kind === 'INTRA' ? (<><th className="text-right">CGST</th><th className="text-right">SGST</th></>) : <th className="text-right">IGST</th>}<th className="text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ it, s }) => (
                <tr key={it.id}><td className="py-2.5">{it.productName} <span className="text-ink/60">({it.variantLabel})</span></td><td>{it.hsn}</td><td className="text-right">{it.qty}</td><td className="text-right">{formatINR(s.taxable)}</td><td className="text-right">{it.gstRate}%</td>{kind === 'INTRA' ? (<><td className="text-right">{formatINR(s.cgst)}</td><td className="text-right">{formatINR(s.sgst)}</td></>) : <td className="text-right">{formatINR(s.igst)}</td>}<td className="text-right font-medium">{formatINR(it.lineTotalPaise)}</td></tr>
              ))}
              {o.shippingPaise > 0 && (<tr><td className="py-2.5" colSpan={kind === 'INTRA' ? 7 : 6}>Delivery charges (incl. GST)</td><td className="text-right font-medium">{formatINR(o.shippingPaise)}</td></tr>)}
            </tbody>
          </table>
        </div>
        <dl className="ml-auto mt-6 w-full max-w-xs space-y-1.5">
          <div className="flex justify-between"><dt>Taxable value</dt><dd>{formatINR(o.taxablePaise)}</dd></div>
          {kind === 'INTRA' ? (<><div className="flex justify-between"><dt>CGST</dt><dd>{formatINR(o.cgstPaise)}</dd></div><div className="flex justify-between"><dt>SGST</dt><dd>{formatINR(o.sgstPaise)}</dd></div></>) : (<div className="flex justify-between"><dt>IGST</dt><dd>{formatINR(o.igstPaise)}</dd></div>)}
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Invoice total</dt><dd>{formatINR(o.totalPaise)}</dd></div>
        </dl>
        <p className="mt-8 text-xs text-ink/60">This is a computer-generated invoice. Prices are inclusive of GST. Please verify GSTIN, HSN codes and rates with your CA before relying on this format for filing.</p>
      </article>
    </div>
  );
}
