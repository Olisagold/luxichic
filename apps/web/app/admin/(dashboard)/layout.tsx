import { notFound, redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { AdminBadgesProvider } from '@/components/admin/AdminBadgesProvider';
import { loadBadges } from '@/lib/analytics/admin-queries';
import { adminLoginPath } from '@/lib/auth/admin-gate';
import { getAdmin } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { loadSecurity } from '@/lib/settings/store';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // Every admin page is checked on the server: a Supabase session AND an active row in `admins`.
  const admin = await getAdmin();
  if (!admin) {
    // With a secret address, nothing here hints that an admin exists: not signed in as staff looks like a missing
    // page (staff sign in at their secret address).
    if (env.ADMIN_PATH) notFound();
    redirect('/admin/login');
  }
  const { sessionTimeoutMinutes } = await loadSecurity();
  return (
    <AdminAuthProvider admin={admin} loginPath={adminLoginPath(env.ADMIN_PATH)} idleMinutes={sessionTimeoutMinutes}>
      <AdminBadgesProvider value={await loadBadges(admin)}>
        <AdminLayout>{children}</AdminLayout>
      </AdminBadgesProvider>
    </AdminAuthProvider>
  );
}
