import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Specialists } from '@/views/admin/salon/Specialists';

export const metadata: Metadata = { title: 'Specialists — Admin' };

export default function AdminSpecialistsPage() {
  return (
    <RequirePermission permission="salon.specialists">
      <Specialists />
    </RequirePermission>
  );
}
