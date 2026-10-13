import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { AdminBadgesProvider } from '@/components/admin/AdminBadgesProvider';
import { loadBadges } from '@/lib/analytics/admin-queries';
import { getAdmin } from '@/lib/auth/session';
import { loadSecurity } from '@/lib/settings/store';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // Every admin page is checked on the server: a Supabase session AND an active row in `admins`.
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  const { sessionTimeoutMinutes } = await loadSecurity();
  return (
    <AdminAuthProvider admin={admin} idleMinutes={sessionTimeoutMinutes}>
      <AdminBadgesProvider value={await loadBadges()}>
        <AdminLayout>{children}</AdminLayout>
      </AdminBadgesProvider>
    </AdminAuthProvider>
  );
}
