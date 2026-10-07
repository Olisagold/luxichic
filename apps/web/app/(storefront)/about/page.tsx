import type { Metadata } from 'next';
import { About } from '@/views/info/About';

export const metadata: Metadata = { title: 'About LUXICHIC' };

export default function AboutPage() {
  return <About />;
}
