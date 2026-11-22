import Image from 'next/image';
import Link from 'next/link';

export default function Logo({ className = 'h-9 w-auto', light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" aria-label="Raazwood home" className="inline-flex items-center">
      <Image
        src="/brand/logo-full.png"
        alt="Raazwood"
        width={1600}
        height={186}
        priority
        className={className}
        style={light ? { filter: 'brightness(1.25) saturate(.9)' } : undefined}
      />
    </Link>
  );
}
