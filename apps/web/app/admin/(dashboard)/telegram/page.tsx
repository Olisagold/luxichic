import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { settingsFor } from '@/lib/settings/admin-queries';
import { AdminSettingsProvider } from '@/components/admin/AdminSettingsProvider';
import { TelegramSettings } from '@/views/admin/operations/TelegramSettings';

export const metadata: Metadata = { title: 'Telegram — Admin' };

export default async function AdminTelegramPage() {
  const data = await settingsFor('settings.general', { telegram: true });
  return (
    <RequirePermission permission="settings.general">
      {data && (
        <AdminSettingsProvider value={data}>
          <TelegramSettings />
        </AdminSettingsProvider>
      )}
    </RequirePermission>
  );
}
