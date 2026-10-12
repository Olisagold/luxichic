import type { Metadata } from 'next';
import { getCustomer } from '@/lib/auth/session';
import { reviewsByUser } from '@/lib/reviews/queries';
import { AccountReviews } from '@/views/account/AccountReviews';

export const metadata: Metadata = { title: 'My reviews' };

export default async function AccountReviewsPage() {
  const customer = await getCustomer();
  return <AccountReviews reviews={customer ? await reviewsByUser(customer.id) : []} />;
}
