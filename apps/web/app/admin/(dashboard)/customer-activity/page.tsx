import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { CustomerActivity } from '@/views/admin/customers/CustomerActivity';

export const metadata: Metadata = { title: 'Customer activity — Admin' };

export default function AdminCustomerActivityPage() {
  return (
    <RequirePermission permission="customers.view">
      <CustomerActivity />
    </RequirePermission>);

}
