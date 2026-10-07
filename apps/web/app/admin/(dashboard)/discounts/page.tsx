import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Discounts } from '@/views/admin/catalog/Discounts';

export const metadata: Metadata = { title: 'Discounts — Admin' };

export default function AdminDiscountsPage() {
  return (
    <RequirePermission permission="discounts.manage">
      <Discounts />
    </RequirePermission>
  );
}
