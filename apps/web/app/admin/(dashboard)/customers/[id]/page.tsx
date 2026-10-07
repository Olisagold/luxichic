import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { CustomerDetail } from '@/views/admin/customers/CustomerDetail';

export const metadata: Metadata = { title: 'Customer — Admin' };

export default function AdminCustomerDetailPage() {
  return (
    <RequirePermission permission="customers.view">
      <CustomerDetail />
    </RequirePermission>);

}
