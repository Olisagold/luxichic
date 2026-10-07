import type { Metadata } from 'next';
import { Cart } from '@/views/shop/Cart';

export const metadata: Metadata = { title: 'Shopping Cart' };

export default function CartPage() {
  return <Cart />;
}
