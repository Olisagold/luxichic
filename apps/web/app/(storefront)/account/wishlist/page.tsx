import type { Metadata } from 'next';
import { AccountWishlist } from '@/views/account/AccountWishlist';

export const metadata: Metadata = { title: 'My wishlist' };

export default function AccountWishlistPage() {
  return <AccountWishlist />;
}
