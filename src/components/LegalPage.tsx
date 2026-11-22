import { STORE } from '@/config/store';

export default function LegalPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="container-x max-w-3xl py-14">
      <p className="eyebrow">{STORE.name}</p>
      <h1 className="h-display mt-2 text-4xl md:text-5xl">{title}</h1>
      {intro && <p className="mt-4 text-lg text-ink/75">{intro}</p>}
      <div className="mt-8 space-y-4 leading-relaxed text-ink/85 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div>
    </div>
  );
}
