import { POLICY, USPS } from '@/config/store';

/** Thin bar above the header: the offer (if set) or the rotating-free list of core promises. */
export default function AnnouncementBar() {
  return (
    <div className="bg-walnut text-[13px] text-bone">
      <div className="container-x flex min-h-9 flex-wrap items-center justify-center gap-x-6 gap-y-1 py-1.5 text-center">
        {POLICY.offerBanner ? (
          <p className="font-medium text-brand">{POLICY.offerBanner}</p>
        ) : (
          <>
            <p className="font-medium text-brand">Solid sheesham furniture, delivered across India</p>
            <p className="hidden text-bone/80 sm:block">{USPS[2].title} · {USPS[3].title}</p>
          </>
        )}
      </div>
    </div>
  );
}
