import type { Metadata } from 'next';
import { AdminSettingsProvider } from '@/components/admin/AdminSettingsProvider';
import { settingsFor } from '@/lib/settings/admin-queries';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { PaymentSettings } from '@/views/admin/operations/PaymentSettings';

export const metadata: Metadata = { title: 'Payments | Admin' };

export default async function AdminPaymentSettingsPage() {
  const data = await settingsFor('settings.payment');
  return (
    <RequirePermission permission="settings.payment">
      {data && (
        <AdminSettingsProvider value={data}>
          <PaymentSettings />
        </AdminSettingsProvider>
      )}
    </RequirePermission>
  );
}
