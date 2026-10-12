import type { Metadata } from 'next';
import { AdminSettingsProvider } from '@/components/admin/AdminSettingsProvider';
import { settingsFor } from '@/lib/settings/admin-queries';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { DeliverySettings } from '@/views/admin/operations/DeliverySettings';

export const metadata: Metadata = { title: 'Delivery — Admin' };

export default async function AdminDeliverySettingsPage() {
  const data = await settingsFor('settings.delivery');
  return (
    <RequirePermission permission="settings.delivery">
      {data && (
        <AdminSettingsProvider value={data}>
          <DeliverySettings />
        </AdminSettingsProvider>
      )}
    </RequirePermission>
  );
}
