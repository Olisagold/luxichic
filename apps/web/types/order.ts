import type { Division } from '@/types/product';

export interface CartItem {
  /** Unique per product + variant selection. */
  key: string;
  productId: string;
  slug: string;
  division: Division;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  variants: Record<string, string>;
  savedForLater?: boolean;
}

export type OrderItem = Omit<CartItem, 'savedForLater'>;

export type PaymentMethod = 'bank_transfer' | 'pay_on_delivery';

export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export type PaymentStatus = 'Pending Verification' | 'Payment Confirmed' | 'Pay on Delivery' | 'Paid';

export type TimelineStep =
  'Order Placed' | 'Awaiting Payment' | 'Payment Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface TimelineEntry {
  step: TimelineStep;
  at: string | null;
}

export interface Customer {
  fullName: string;
  email: string;
  phone: string;
}

export interface Address {
  id: string;
  label?: string;
  country: string;
  state: string;
  city: string;
  street: string;
  houseNumber?: string;
  landmark?: string;
  instructions?: string;
  isDefault?: boolean;
}

export interface AccountToken {
  token: string;
  expiresAt: string;
}

export interface Order {
  orderNumber: string;
  reference: string;
  createdAt: string;
  customer: Customer;
  address: Address;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  timeline: TimelineEntry[];
  /** Set when the order belongs to a registered account. */
  accountEmail?: string;
  /** Account-creation link issued after a guest order is confirmed (prototype). */
  accountToken?: AccountToken;
  /** Administrator who verified the payment (prototype audit). */
  confirmedBy?: string;
  cancelReason?: string;
}
