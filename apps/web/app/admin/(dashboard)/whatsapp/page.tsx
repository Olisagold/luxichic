import type { Metadata } from 'next';
import { AdminSettingsProvider } from '@/components/admin/AdminSettingsProvider';
import { settingsFor } from '@/lib/settings/admin-queries';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { WhatsAppSettings } from '@/views/admin/operations/WhatsAppSettings';

export const metadata: Metadata = { title: 'WhatsApp — Admin' };

export default async function AdminWhatsAppSettingsPage() {
  const data = await settingsFor('settings.whatsapp');
  return (
    <RequirePermission permission="settings.whatsapp">
      {data && (
        <AdminSettingsProvider value={data}>
          <WhatsAppSettings />
        </AdminSettingsProvider>
      )}
    </RequirePermission>
  );
}
