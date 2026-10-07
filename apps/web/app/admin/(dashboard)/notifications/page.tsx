import type { Metadata } from 'next';
import { Notifications } from '@/views/admin/operations/Notifications';

export const metadata: Metadata = { title: 'Notifications — Admin' };

export default function AdminNotificationsPage() {
  return <Notifications />;
}
