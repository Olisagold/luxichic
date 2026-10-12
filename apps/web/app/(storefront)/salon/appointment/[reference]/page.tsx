import type { Metadata } from 'next';
import { canManage, getAppointmentForViewer } from '@/lib/salon/queries';
import { AppointmentConfirmation } from '@/views/salon/AppointmentConfirmation';

export const metadata: Metadata = { title: 'Your appointment', robots: { index: false } };

export default async function AppointmentPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const appointment = await getAppointmentForViewer(decodeURIComponent(reference));
  return <AppointmentConfirmation appointment={appointment} manageable={!!appointment && canManage(appointment)} />;
}
