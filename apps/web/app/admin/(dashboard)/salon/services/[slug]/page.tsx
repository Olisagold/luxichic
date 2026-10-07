import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { ServiceEditor } from '@/views/admin/salon/ServiceEditor';

export const metadata: Metadata = { title: 'Edit service — Admin' };

export default function AdminServiceEditorPage() {
  return (
    <RequirePermission permission="salon.services">
      <ServiceEditor />
    </RequirePermission>
  );
}
