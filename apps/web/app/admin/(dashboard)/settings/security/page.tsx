import type { Metadata } from 'next';
import { SecuritySettings } from '@/views/admin/settings/SecuritySettings';

export const metadata: Metadata = { title: 'Security — Admin' };

export default function AdminSecuritySettingsPage() {
  return <SecuritySettings />;
}
