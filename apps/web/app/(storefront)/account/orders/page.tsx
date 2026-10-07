import type { Metadata } from 'next';
import { AccountOrders } from '@/views/account/AccountOrders';

export const metadata: Metadata = { title: 'My orders' };

export default function AccountOrdersPage() {
  return <AccountOrders />;
}
