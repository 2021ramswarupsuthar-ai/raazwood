import { POLICY } from '@/config/store';

/** Delivery / returns / care blocks on the product page. Wording only states what the store actually does. */
export default function InfoAccordion({ finish }: { finish?: string }) {
  const rows: { title: string; body: React.ReactNode; open?: boolean }[] = [
    {
      title: 'Delivery & installation',
      open: true,
      body: <p>We deliver across India. Enter your pincode above to see the delivery charge and estimated days for your location. Estimates are indicative and can vary with the courier or freight partner. Please check door and lift sizes before ordering large pieces.</p>,
    },
    {
      title: 'Returns, damage & refunds',
      body: (
        <>
          {POLICY.returns && <p className="mb-2 font-medium text-ink">{POLICY.returns}</p>}
          <p>If your furniture arrives damaged, take photos or a video while unboxing and message us on WhatsApp with your order reference straight away. See the full Returns &amp; Refund policy for the current terms.</p>
        </>
      ),
    },
    ...(POLICY.warranty ? [{ title: 'Warranty', body: <p>{POLICY.warranty}</p> }] : []),
    {
      title: 'Care & maintenance',
      body: <p>Dust with a soft dry cloth, wipe spills quickly, keep away from direct sunlight, heat and damp, and use coasters and mats.{finish ? ` Finish: ${finish}.` : ''}</p>,
    },
  ];
  return (
    <div className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line/70">
      {rows.map((r) => (
        <details key={r.title} open={r.open} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{r.title}<span className="text-brand-dark transition group-open:rotate-45" aria-hidden="true">+</span></summary>
          <div className="mt-3 text-sm leading-relaxed text-ink/75">{r.body}</div>
        </details>
      ))}
    </div>
  );
}
