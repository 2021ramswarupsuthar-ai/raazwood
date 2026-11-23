export default function Stars({ value, size = 'text-base' }: { value: number; size?: string }) {
  const full = Math.round(value);
  return (
    <span className={`${size} tracking-tight`} aria-label={`${value} out of 5 stars`} role="img">
      <span className="text-brand-dark" aria-hidden="true">{'★'.repeat(full)}</span>
      <span className="text-line" aria-hidden="true">{'★'.repeat(5 - full)}</span>
    </span>
  );
}
