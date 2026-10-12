import type { Metadata } from 'next';
import { getOrderForViewer } from '@/lib/orders/queries';
import { OrderConfirmation } from '@/views/checkout/OrderConfirmation';

export const metadata: Metadata = { title: 'Order confirmed', robots: { index: false } };

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return <OrderConfirmation order={await getOrderForViewer(decodeURIComponent(orderNumber))} />;
}
