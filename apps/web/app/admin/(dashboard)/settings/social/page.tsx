import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { SocialSettings } from '@/views/admin/settings/SocialSettings';

export const metadata: Metadata = { title: 'Social links — Admin' };

export default function AdminSocialSettingsPage() {
  return (
    <RequirePermission permission="settings.general">
      <SocialSettings />
    </RequirePermission>);

}
