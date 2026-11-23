import { z } from 'zod';
import { isValidPincode } from './pincode.ts';
import { STATES } from '../config/states.ts';

export const cartItemSchema = z.object({
  variantId: z.string().min(1).max(50),
  qty: z.number().int().min(1).max(20),
});

export const cartSchema = z.array(cartItemSchema).min(1).max(30);

const stateCodes = STATES.map((s) => s.code);

export const checkoutSchema = z.object({
  items: cartSchema,
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    // people type numbers as "98765 43210" or "+91 98765-43210": strip spaces/dashes first
    phone: z
      .string()
      .transform((v) => v.replace(/[\s-]/g, ''))
      .pipe(z.string().regex(/^(?:\+?91)?[6-9][0-9]{9}$/, 'Enter a valid 10-digit Indian mobile number')),
    email: z.string().trim().email().max(120).optional().or(z.literal('')),
  }),
  address: z.object({
    line1: z.string().trim().min(5).max(150),
    line2: z.string().trim().max(150).optional().or(z.literal('')),
    city: z.string().trim().min(2).max(60),
    stateCode: z.string().refine((s) => stateCodes.includes(s.toUpperCase()), 'Select a valid state'),
    pincode: z.string().refine(isValidPincode, 'Enter a valid 6-digit pincode'),
  }),
  notes: z.string().trim().max(300).optional().or(z.literal('')),
  couponCode: z.string().trim().max(30).optional().or(z.literal('')),
  saveAddress: z.boolean().optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const quoteSchema = z.object({
  items: cartSchema,
  stateCode: z.string().refine((s) => stateCodes.includes(s.toUpperCase())),
  pincode: z.string().refine(isValidPincode),
  couponCode: z.string().trim().max(30).optional().or(z.literal('')),
});

const mobile = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^(?:\+?91)?[6-9][0-9]{9}$/, 'Enter a valid 10-digit Indian mobile number'));

export const addressSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: mobile,
  line1: z.string().trim().min(5).max(150),
  line2: z.string().trim().max(150).optional().or(z.literal('')),
  city: z.string().trim().min(2).max(60),
  stateCode: z.string().refine((s) => stateCodes.includes(s.toUpperCase()), 'Select a valid state'),
  pincode: z.string().refine(isValidPincode, 'Enter a valid 6-digit pincode'),
  isDefault: z.boolean().optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().email('Enter a valid email').max(120).optional().or(z.literal('')),
});

export const reviewSchema = z.object({
  productId: z.string().min(1).max(50),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3, 'Add a short title').max(80),
  body: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(1500),
  city: z.string().trim().max(60).optional().or(z.literal('')),
});

export const couponFormSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,24}$/, '3-24 letters, numbers, - or _'),
  description: z.string().trim().max(200),
  kind: z.enum(['PERCENT', 'FLAT']),
  value: z.coerce.number().positive(),
  minOrderRupees: z.coerce.number().min(0).max(10_000_000),
  maxDiscountRupees: z.coerce.number().min(0).max(10_000_000).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  usageLimit: z.coerce.number().int().min(1).max(1_000_000).optional(),
  isActive: z.boolean(),
});

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase letters, numbers and hyphens only').max(60),
  description: z.string().trim().max(500),
  image: z.string().trim().max(500).refine((u) => u === '' || /^(https:\/\/|\/)/.test(u), 'Image must be an https:// URL or a /path').optional(),
  sortOrder: z.coerce.number().int().min(0).max(999),
  seoTitle: z.string().trim().max(70).optional(),
  seoDesc: z.string().trim().max(170).optional(),
});

export const blogFormSchema = z.object({
  title: z.string().trim().min(5).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase letters, numbers and hyphens only').max(120),
  excerpt: z.string().trim().max(300),
  body: z.string().trim().min(20).max(30_000),
  coverImage: z.string().trim().max(500).refine((u) => u === '' || /^(https:\/\/|\/)/.test(u), 'Image must be an https:// URL or a /path').optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDesc: z.string().trim().max(170).optional(),
  isPublished: z.boolean(),
});

export const verifySchema = z.object({
  publicId: z.string().min(8).max(40),
  razorpay_order_id: z.string().min(5).max(60),
  razorpay_payment_id: z.string().min(5).max(60),
  razorpay_signature: z.string().min(20).max(200),
});

export const productFormSchema = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase letters, numbers and hyphens only').max(120),
  categoryId: z.string().min(1),
  shortDesc: z.string().trim().max(200),
  description: z.string().trim().max(5000),
  material: z.string().trim().max(120),
  finish: z.string().trim().max(120),
  dimensions: z.string().trim().max(200),
  hsn: z.string().trim().regex(/^[0-9]{4,8}$/),
  gstRate: z.coerce.number().int().min(0).max(28),
  seoTitle: z.string().trim().max(70).optional(),
  seoDesc: z.string().trim().max(170).optional(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

export const variantFormSchema = z.object({
  sku: z.string().trim().min(2).max(40),
  label: z.string().trim().min(1).max(80),
  packQty: z.coerce.number().int().min(1).max(20),
  mrpRupees: z.coerce.number().min(1).max(10_000_000),
  priceRupees: z.coerce.number().min(1).max(10_000_000),
  stock: z.coerce.number().int().min(0).max(100000),
  shippingRupees: z.coerce.number().min(0).max(1_000_000),
});
