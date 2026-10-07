import type { Metadata } from 'next';
import { OrderConfirmation } from '@/views/checkout/OrderConfirmation';

export const metadata: Metadata = { title: 'Order confirmed' };

export default function OrderConfirmationPage() {
  return <OrderConfirmation />;
}
