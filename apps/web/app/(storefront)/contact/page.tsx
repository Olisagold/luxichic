import type { Metadata } from 'next';
import { Contact } from '@/views/info/Contact';

export const metadata: Metadata = { title: 'Contact us' };

export default function ContactPage() {
  return <Contact />;
}
