import type { Metadata } from 'next';
import { ForgotPassword } from '@/views/auth/ForgotPassword';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return <ForgotPassword />;
}
