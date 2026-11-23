// Small shared building blocks for admin pages (server components).
export function Flash({ saved, error }: { saved?: string; error?: string }) {
  return (
    <>
      {saved && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">Saved.</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
    </>
  );
}

export function Field({ name, label, value, hint, type = 'text', required, max, step, placeholder }: { name: string; label: string; value?: string | number | null; hint?: string; type?: string; required?: boolean; max?: number; step?: string; placeholder?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} defaultValue={value ?? undefined} required={required} maxLength={type === 'text' ? max : undefined} step={step} placeholder={placeholder} className="field" />
      {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
    </div>
  );
}

/** File downloads (CSV route handlers) must be a plain <a>: next/link would try a client-side page navigation. */
export function DownloadLink({ href, children, className = 'btn btn-ghost' }: { href: string; children: React.ReactNode; className?: string }) {
  // eslint-disable-next-line @next/next/no-html-link-for-pages
  return <a href={href} download className={className}>{children}</a>;
}

export const Card =({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`rounded-2xl bg-white p-5 ring-1 ring-line/70 ${className}`}>{children}</div>;
