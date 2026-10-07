import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { PaymentSettings } from '@/views/admin/operations/PaymentSettings';

export const metadata: Metadata = { title: 'Payments — Admin' };

export default function AdminPaymentSettingsPage() {
  return (
    <RequirePermission permission="settings.payment">
      <PaymentSettings />
    </RequirePermission>
  );
}
