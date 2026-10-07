import type { Customer } from '@/types/order';

export interface Personnel {
  id: string;
  name: string;
  role: string;
}

export interface SalonService {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  includes: string[];
  startingPrice: number | null;
  duration: string | null;
  image: string;
  personnel: Personnel[];
  whatsapp: string;
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Rescheduled' | 'Completed' | 'Rejected' | 'Cancelled';

export interface AppointmentEvent {
  at: string;
  label: string;
  by?: string;
  note?: string;
}

export interface Appointment {
  reference: string;
  serviceSlug: string;
  serviceName: string;
  date: string;
  time: string;
  personnelId?: string;
  personnelName?: string;
  customer: Customer;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
  accountEmail?: string;
  /** Reason given when rejected or rescheduled. */
  reason?: string;
  original?: {date: string;time: string;personnelName?: string;};
  history?: AppointmentEvent[];
}