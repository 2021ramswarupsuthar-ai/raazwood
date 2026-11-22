export type Status = 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';

const NEXT: Record<Status, Status[]> = {
  PENDING_PAYMENT: ['CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  EXPIRED: [],
  REFUNDED: [],
};

export const allowedNext = (s: Status): Status[] => NEXT[s];
export const canTransition = (from: Status, to: Status): boolean => NEXT[from].includes(to);
export const isPaidStatus = (s: Status): boolean => ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(s);

export const STATUS_LABEL: Record<Status, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  REFUNDED: 'Refunded',
};
