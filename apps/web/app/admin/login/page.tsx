import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { getAdmin } from '@/lib/auth/session';
import { AdminLogin } from '@/views/admin/AdminLogin';

export const metadata: Metadata = { title: 'Admin sign in' };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect('/admin/dashboard');
  return (
    <AdminAuthProvider admin={null}>
      <AdminLogin />
    </AdminAuthProvider>
  );
}
