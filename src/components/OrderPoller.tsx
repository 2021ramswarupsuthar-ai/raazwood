'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** While payment is being confirmed (webhook can lag a few seconds) refresh the page every 4s for up to 2 minutes. */
export default function OrderPoller({ publicId }: { publicId: string }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(async () => {
      if (++n > 30) { clearInterval(t); return; }
      try {
        const r = await fetch(`/api/order-status/${publicId}`, { cache: 'no-store' });
        const d = (await r.json()) as { status?: string };
        if (d.status && d.status !== 'PENDING_PAYMENT') { clearInterval(t); router.refresh(); }
      } catch { /* retry next tick */ }
    }, 4000);
    return () => clearInterval(t);
  }, [publicId, router]);
  return null;
}
