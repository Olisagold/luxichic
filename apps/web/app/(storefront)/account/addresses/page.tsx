import type { Metadata } from 'next';
import { AccountAddresses } from '@/views/account/AccountAddresses';

export const metadata: Metadata = { title: 'My addresses' };

export default function AccountAddressesPage() {
  return <AccountAddresses />;
}
