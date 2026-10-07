import type { Metadata } from 'next';
import { AccountProfile } from '@/views/account/AccountProfile';

export const metadata: Metadata = { title: 'Profile' };

export default function AccountProfilePage() {
  return <AccountProfile />;
}
