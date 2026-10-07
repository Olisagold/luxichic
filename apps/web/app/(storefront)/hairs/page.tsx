import type { Metadata } from 'next';
import { HairsHome } from '@/views/shop/HairsHome';

export const metadata: Metadata = { title: 'LUXICHIC Hairs' };

export default function HairsPage() {
  return <HairsHome />;
}
