import type { Metadata } from 'next';
import { AdminLogin } from '@/views/admin/AdminLogin';

export const metadata: Metadata = { title: 'Admin sign in' };

export default function AdminLoginPage() {
  return <AdminLogin />;
}
