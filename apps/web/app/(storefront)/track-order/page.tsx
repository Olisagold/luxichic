import type { Metadata } from 'next';
import { TrackOrder } from '@/views/checkout/TrackOrder';

export const metadata: Metadata = { title: 'Track your order' };

export default function TrackOrderPage() {
  return <TrackOrder />;
}
