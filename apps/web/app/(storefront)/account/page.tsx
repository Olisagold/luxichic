import type { Metadata } from 'next';
import { AccountOverview } from '@/views/account/AccountOverview';

export const metadata: Metadata = { title: 'My account' };

export default function AccountOverviewPage() {
  return <AccountOverview />;
}
