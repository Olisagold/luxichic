import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { BusinessSettings } from '@/views/admin/settings/BusinessSettings';

export const metadata: Metadata = { title: 'Business settings — Admin' };

export default function AdminBusinessSettingsPage() {
  return (
    <RequirePermission permission="settings.general">
      <BusinessSettings mode="business" />
    </RequirePermission>
  );
}
