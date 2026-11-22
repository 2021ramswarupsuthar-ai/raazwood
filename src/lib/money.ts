// All money is stored and calculated in paise (integers). Never use floats for money.
export const toPaise = (rupees: number): number => Math.round(rupees * 100);

export function formatINR(paise: number): string {
  const whole = paise % 100 === 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(paise / 100);
}

export function discountPercent(mrpPaise: number, pricePaise: number): number {
  if (mrpPaise <= 0 || pricePaise >= mrpPaise) return 0;
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}
