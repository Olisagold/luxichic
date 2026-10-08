import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { getAdmin } from '@/lib/auth/session';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // Every admin page is checked on the server: a Supabase session AND an active row in `admins`.
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return (
    <AdminAuthProvider admin={admin}>
      <AdminLayout>{children}</AdminLayout>
    </AdminAuthProvider>
  );
}
