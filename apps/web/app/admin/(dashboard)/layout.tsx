import { AdminLayout } from '@/components/admin/layout/AdminLayout';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
