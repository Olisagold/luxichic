import type { Metadata } from 'next';
import { AppointmentConfirmation } from '@/views/salon/AppointmentConfirmation';

export const metadata: Metadata = { title: 'Appointment request received' };

export default function AppointmentConfirmationPage() {
  return <AppointmentConfirmation />;
}
