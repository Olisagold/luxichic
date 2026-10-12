import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { listDiscounts } from '@/lib/checkout/discount-rows';
import { Discounts } from '@/views/admin/catalog/Discounts';

export const metadata: Metadata = { title: 'Discounts — Admin' };

export default async function AdminDiscountsPage() {
  const admin = await getAdmin();
  const discounts = admin && hasPermission(admin, 'discounts.manage') ? await listDiscounts() : [];
  return (
    <RequirePermission permission="discounts.manage">
      <Discounts discounts={discounts} />
    </RequirePermission>
  );
}
