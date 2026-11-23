// Indian mobile numbers. We store 10 digits without the country code.
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '').replace(/^\+?91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
  return /^[6-9][0-9]{9}$/.test(digits) ? digits : null;
}

/** "98765 43210" -> "98XXXXXX10" for logs and admin lists where the full number is not needed. */
export const maskPhone = (p: string): string => (p.length >= 4 ? `${p.slice(0, 2)}${'X'.repeat(Math.max(0, p.length - 4))}${p.slice(-2)}` : p);
