import type { Metadata } from 'next';
import { AccountReviews } from '@/views/account/AccountReviews';

export const metadata: Metadata = { title: 'My reviews' };

export default function AccountReviewsPage() {
  return <AccountReviews />;
}
