import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { DeliverySettings } from '@/views/admin/operations/DeliverySettings';

export const metadata: Metadata = { title: 'Delivery — Admin' };

export default function AdminDeliverySettingsPage() {
  return (
    <RequirePermission permission="settings.delivery">
      <DeliverySettings />
    </RequirePermission>
  );
}
