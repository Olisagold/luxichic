import type { Metadata } from 'next';
import { CreateAccount } from '@/views/auth/CreateAccount';

export const metadata: Metadata = { title: 'Create your account' };

export default function CreateAccountPage() {
  return <CreateAccount />;
}
