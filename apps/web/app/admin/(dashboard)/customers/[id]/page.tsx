import type { Metadata } from 'next';
import { AdminCustomersProvider } from '@/components/admin/AdminCustomersProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { customersFor } from '@/lib/customers/admin-queries';
import { CustomerDetail } from '@/views/admin/customers/CustomerDetail';

export const metadata: Metadata = { title: 'Customer | Admin' };

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequirePermission permission="customers.view">
      <AdminCustomersProvider value={await customersFor({ reviews: true, notesFor: decodeURIComponent(id) })}>
        <CustomerDetail />
      </AdminCustomersProvider>
    </RequirePermission>
  );
}
