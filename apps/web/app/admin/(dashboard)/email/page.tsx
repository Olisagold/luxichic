import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { EmailSettings } from '@/views/admin/operations/EmailSettings';

export const metadata: Metadata = { title: 'Email — Admin' };

export default function AdminEmailSettingsPage() {
  return (
    <RequirePermission permission="settings.email">
      <EmailSettings />
    </RequirePermission>);

}
