import type { Metadata } from 'next';
import { AdminCustomersProvider } from '@/components/admin/AdminCustomersProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { customersFor } from '@/lib/customers/admin-queries';
import { Customers } from '@/views/admin/customers/Customers';

export const metadata: Metadata = { title: 'Customers — Admin' };

export default async function AdminCustomersPage() {
  return (
    <RequirePermission permission="customers.view">
      <AdminCustomersProvider value={await customersFor()}>
        <Customers />
      </AdminCustomersProvider>
    </RequirePermission>
  );
}
