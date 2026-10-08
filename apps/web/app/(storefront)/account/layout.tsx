import { redirect } from 'next/navigation';
import { AccountLayout } from '@/components/account/AccountLayout';
import { getCustomer } from '@/lib/auth/session';

export default async function AccountSectionLayout({ children }: { children: React.ReactNode }) {
  // Checked on the server for every account page; the middleware already sent signed-out visitors to /login.
  if (!(await getCustomer())) redirect('/login?redirect=/account');
  return <AccountLayout>{children}</AccountLayout>;
}
