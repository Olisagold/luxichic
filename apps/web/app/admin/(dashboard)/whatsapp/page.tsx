import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { WhatsAppSettings } from '@/views/admin/operations/WhatsAppSettings';

export const metadata: Metadata = { title: 'WhatsApp — Admin' };

export default function AdminWhatsAppSettingsPage() {
  return (
    <RequirePermission permission="settings.whatsapp">
      <WhatsAppSettings />
    </RequirePermission>
  );
}
