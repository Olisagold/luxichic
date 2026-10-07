import type { Metadata } from 'next';
import { BookAppointment } from '@/views/salon/BookAppointment';

export const metadata: Metadata = { title: 'Book an appointment' };

export default function BookAppointmentPage() {
  return <BookAppointment />;
}
