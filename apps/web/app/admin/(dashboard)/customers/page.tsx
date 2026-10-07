import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Customers } from '@/views/admin/customers/Customers';

export const metadata: Metadata = { title: 'Customers — Admin' };

export default function AdminCustomersPage() {
  return (
    <RequirePermission permission="customers.view">
      <Customers />
    </RequirePermission>);

}
