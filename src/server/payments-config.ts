import 'server-only';
import { isValidVpa } from '@/lib/upi';

export type PaymentMode = 'razorpay' | 'manual_upi' | 'none';

/**
 * PAYMENT_PROVIDER=razorpay|manual_upi picks explicitly. Without it: Razorpay when its keys are set, otherwise
 * the manual UPI fallback when UPI_VPA is set, otherwise online payment is off (checkout explains this).
 */
export function paymentMode(): PaymentMode {
  const rzp = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const upi = Boolean(process.env.UPI_VPA && isValidVpa(process.env.UPI_VPA));
  const want = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (want === 'manual_upi') return upi ? 'manual_upi' : 'none';
  if (want === 'razorpay') return rzp ? 'razorpay' : 'none';
  return rzp ? 'razorpay' : upi ? 'manual_upi' : 'none';
}

export const manualUpi = () => ({
  vpa: process.env.UPI_VPA ?? '',
  payeeName: process.env.UPI_PAYEE_NAME || 'Krishana Art Palace',
  expiryHours: Math.max(1, Number(process.env.MANUAL_UPI_EXPIRY_HOURS ?? 24)),
});
