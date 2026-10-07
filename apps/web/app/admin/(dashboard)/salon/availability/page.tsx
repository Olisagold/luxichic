import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Availability } from '@/views/admin/salon/Availability';

export const metadata: Metadata = { title: 'Availability — Admin' };

export default function AdminAvailabilityPage() {
  return (
    <RequirePermission permission="salon.availability">
      <Availability />
    </RequirePermission>);

}
