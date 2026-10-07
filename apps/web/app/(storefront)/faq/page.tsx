import type { Metadata } from 'next';
import { FAQ } from '@/views/info/FAQ';

export const metadata: Metadata = { title: 'Frequently asked questions' };

export default function FAQPage() {
  return <FAQ />;
}
