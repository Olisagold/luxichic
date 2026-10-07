import React from 'react';
import { useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarSearchIcon, CheckIcon } from 'lucide-react';
import { useOrders } from '../../contexts/OrdersContext';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { WhatsAppButton } from '../../components/ui/WhatsAppButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { PrototypeNote } from '../../components/ui/PrototypeNote';
import { findService } from '../../data/services';
import { businessConfig } from '../../data/config';
import { formatLongDate, formatSlot } from '../../utils/dates';
import { appointmentMessage } from '../../utils/whatsapp';

export function AppointmentConfirmation() {
  const { reference = '' } = useParams();
  const { getAppointment } = useOrders();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const appt = getAppointment(reference);

  if (!appt) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24">
        <EmptyState icon={<CalendarSearchIcon className="h-7 w-7" />} title="Appointment not found" text="We couldn’t find this appointment on this device." actions={<Button to="/salon/book">Book an appointment</Button>} />
      </div>);

  }

  const service = findService(appt.serviceSlug);
  const rows = [
  { label: 'Service', value: appt.serviceName },
  { label: 'Date', value: formatLongDate(appt.date) },
  { label: 'Time', value: formatSlot(appt.time) },
  { label: 'Specialist', value: appt.personnelName ?? 'To be assigned' },
  { label: 'Name', value: appt.customer.fullName },
  { label: 'Contact', value: `${appt.customer.phone} · ${appt.customer.email}` }];


  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-14">
      <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink text-pink"><CheckIcon className="h-8 w-8" aria-hidden /></span>
        <h1 className="mt-6 font-display text-4xl text-ink md:text-6xl">Appointment requested</h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-charcoal">
          Your appointment request has been received. Our team will contact you to confirm your booking. Payment is only required after your service has been provided.
        </p>
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
          {rows.map((r) =>
          <div key={r.label} className="grid grid-cols-[120px_1fr] gap-4 py-3 text-sm">
              <dt className="text-subtle">{r.label}</dt>
              <dd className="text-ink">{r.value}</dd>
            </div>
          )}
        </dl>
        <WhatsAppButton number={service?.whatsapp ?? businessConfig.whatsapp.general} message={appointmentMessage(appt)} label="Message the salon on WhatsApp" fullWidth size="lg" className="mt-6" />
      </section>

      <PrototypeNote className="mt-6">No confirmation email or message is actually sent in this prototype. Once connected, the salon team will receive your request and contact you.</PrototypeNote>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button to="/salon/services" variant="outline">Explore more services</Button>
        {user && <Button to="/account/appointments">View my appointments</Button>}
      </div>
    </div>);

}