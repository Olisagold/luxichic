import type { Metadata } from 'next';
import { SalonServices } from '@/views/salon/SalonServices';

export const metadata: Metadata = { title: 'Salon services' };

export default function SalonServicesPage() {
  return <SalonServices />;
}
