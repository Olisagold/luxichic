import type { Metadata } from 'next';
import { ToolsHome } from '@/views/shop/ToolsHome';

export const metadata: Metadata = { title: 'Hair Tools & Essentials' };

export default function ToolsPage() {
  return <ToolsHome />;
}
