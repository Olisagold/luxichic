import type { Metadata } from 'next';
import { SalonHome } from '@/views/salon/SalonHome';

export const metadata: Metadata = { title: 'Beauty Salon & Spa' };

export default function SalonPage() {
  return <SalonHome />;
}
