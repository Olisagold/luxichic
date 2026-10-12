'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarSearchIcon, CheckIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { ManageAppointment } from '@/components/salon/ManageAppointment';
import { useCatalog, useStorefront } from '@/components/storefront/StorefrontProvider';
import { formatLongDate, formatSlot } from '@/lib/utils/dates';
import { appointmentMessage } from '@/lib/utils/whatsapp';
import type { Appointment, AppointmentStatus } from '@/types/salon';

const headings: Record<AppointmentStatus, { title: string; text: string }> = {
  Pending: {
    title: 'Appointment requested',
    text: 'Your appointment request has been received. Our team will contact you to confirm your booking. Payment is only required after your service has been provided.',
  },
  Confirmed: {
    title: 'Appointment confirmed',
    text: 'We look forward to seeing you. Payment is only required after your service has been provided.',
  },
  Rescheduled: {
    title: 'Appointment rescheduled',
    text: 'The salon has moved your appointment to the time below. Message us on WhatsApp if it doesn’t suit you.',
  },
  Completed: { title: 'Thank you for visiting', text: 'We hope you loved your service. See you again soon.' },
  Rejected: {
    title: 'Appointment not available',
    text: 'The salon couldn’t take this booking. Please choose another time or message us on WhatsApp.',
  },
  Cancelled: {
    title: 'Appointment cancelled',
    text: 'This appointment has been cancelled. You’re welcome to book again any time.',
  },
};

/**
 * An appointment's page: details, WhatsApp and (while allowed) cancel or reschedule. `appointment` is null
 * unless this account or browser booked it; `manageable` is decided on the server.
 */
export function AppointmentConfirmation({
  appointment: appt,
  manageable,
}: {
  appointment: Appointment | null;
  manageable: boolean;
}) {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const { findService } = useCatalog();
  const { whatsapp } = useStorefront().business;

  if (!appt) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24">
        <EmptyState
          icon={<CalendarSearchIcon className="h-7 w-7" />}
          title="Appointment not found"
          text="We couldn’t show this appointment here. Sign in to the account you booked with, or message the salon on WhatsApp."
          actions={<Button to="/salon/book">Book an appointment</Button>}
        />
      </div>
    );
  }

  const service = findService(appt.serviceSlug);
  const rows = [
    { label: 'Service', value: appt.serviceName },
    { label: 'Date', value: formatLongDate(appt.date) },
    { label: 'Time', value: formatSlot(appt.time) },
    { label: 'Specialist', value: appt.personnelName ?? 'To be assigned' },
    { label: 'Name', value: appt.customer.fullName },
    { label: 'Contact', value: `${appt.customer.phone} · ${appt.customer.email}` },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-14">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="text-center"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink text-pink">
          <CheckIcon className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-4xl text-ink md:text-6xl">{headings[appt.status].title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-charcoal">{headings[appt.status].text}</p>
      </motion.div>

      <section className="mt-10 rounded-[28px] bg-white p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
          <div>
            <p className="text-xs font-semibold text-subtle">Appointment reference</p>
            <p className="font-mono text-2xl font-semibold tracking-[0.14em] text-ink">{appt.reference}</p>
          </div>
          <StatusBadge status={appt.status} />
        </div>
        <dl className="divide-y divide-line">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[120px_1fr] gap-4 py-3 text-sm">
              <dt className="text-subtle">{r.label}</dt>
              <dd className="text-ink">{r.value}</dd>
            </div>
          ))}
        </dl>
        <WhatsAppButton
          number={service?.whatsapp ?? whatsapp.general}
          message={appointmentMessage(appt)}
          label="Message the salon on WhatsApp"
          fullWidth
          size="lg"
          className="mt-6"
        />
      </section>

      {manageable && <ManageAppointment appointment={appt} />}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button to="/salon/services" variant="outline">
          Explore more services
        </Button>
        {user && <Button to="/account/appointments">View my appointments</Button>}
      </div>
    </div>
  );
}
