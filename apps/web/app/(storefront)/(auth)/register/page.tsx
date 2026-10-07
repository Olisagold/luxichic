import type { Metadata } from 'next';
import { Register } from '@/views/auth/Register';

export const metadata: Metadata = { title: 'Create an account' };

export default function RegisterPage() {
  return <Register />;
}
