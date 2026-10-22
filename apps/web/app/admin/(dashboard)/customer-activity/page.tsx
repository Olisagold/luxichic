import type { Metadata } from 'next';
import { AdminCustomersProvider } from '@/components/admin/AdminCustomersProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { customersFor } from '@/lib/customers/admin-queries';
import { CustomerActivity } from '@/views/admin/customers/CustomerActivity';

export const metadata: Metadata = { title: 'Customer activity | Admin' };

export default async function AdminCustomerActivityPage() {
  return (
    <RequirePermission permission="customers.view">
      <AdminCustomersProvider value={await customersFor({ reviews: true })}>
        <CustomerActivity />
      </AdminCustomersProvider>
    </RequirePermission>
  );
}
