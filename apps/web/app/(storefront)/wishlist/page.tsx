import type { Metadata } from 'next';
import { Wishlist } from '@/views/shop/Wishlist';

export const metadata: Metadata = { title: 'Wishlist' };

export default function WishlistPage() {
  return <Wishlist />;
}
