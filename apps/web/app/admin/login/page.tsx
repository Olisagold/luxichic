import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { ADMIN_GATE_HEADER, adminLoginPath } from '@/lib/auth/admin-gate';
import { getAdmin } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { AdminLogin } from '@/views/admin/AdminLogin';

export const metadata: Metadata = { title: 'Admin sign in' };

export default async function AdminLoginPage() {
  // With a secret address, this page exists only there (lib/auth/admin-gate.ts).
  if (env.ADMIN_PATH && (await headers()).get(ADMIN_GATE_HEADER) !== '1') notFound();
  if (await getAdmin()) redirect('/admin/dashboard');
  return (
    <AdminAuthProvider admin={null} loginPath={adminLoginPath(env.ADMIN_PATH)}>
      <AdminLogin />
    </AdminAuthProvider>
  );
}
