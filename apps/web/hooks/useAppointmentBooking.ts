import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrdersContext';
import { findService } from '@/data/services';
import { slotsFor } from '@/lib/utils/availability';
import { isValidEmail, isValidPhone } from '@/lib/utils/validation';

export function useAppointmentBooking(initialService?: string) {
  const { user, isBlockedEmail } = useAuth();
  const { bookAppointment } = useOrders();
  const router = useRouter();

  const [serviceSlug, setServiceSlug] = useState(initialService ?? '');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [personnelId, setPersonnelId] = useState('');
  const [contact, setContact] = useState({ fullName: user?.fullName ?? '', phone: user?.phone ?? '', email: user?.email ?? '' });
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialService) setServiceSlug(initialService);
  }, [initialService]);

  useEffect(() => {
    if (user) setContact((c) => ({ fullName: c.fullName || user.fullName, phone: c.phone || user.phone, email: c.email || user.email }));
  // Only prefill when a different customer signs in, not on every profile edit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const service = findService(serviceSlug);
  const slots = useMemo(
    () => date && serviceSlug ? slotsFor(date, serviceSlug, personnelId || null) : [],
    [date, serviceSlug, personnelId]
  );

  const selectService = (slug: string) => {
    setServiceSlug(slug);
    setTime(null);
    setPersonnelId('');
  };
  const selectDate = (d: string) => {
    setDate(d);
    setTime(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!service) errs.service = 'Please choose a service.';
    if (!date) errs.date = 'Please choose a date.';
    if (!time) errs.time = 'Please choose a time.';
    if (contact.fullName.trim().length < 2) errs.fullName = 'Please enter your full name.';
    if (!isValidPhone(contact.phone)) errs.phone = 'Please enter a valid phone number.';
    if (!isValidEmail(contact.email)) errs.email = 'Please enter a valid email address.';else
    if (isBlockedEmail(contact.email)) errs.email = 'This account can’t book appointments right now. Please contact LUXICHIC.';
    setErrors(errs);
    if (Object.keys(errs).length || !service || !date || !time) return;
    setSubmitting(true);
    const person = service.personnel.find((p) => p.id === personnelId);
    const appt = await bookAppointment({
      serviceSlug: service.slug,
      serviceName: service.name,
      date,
      time,
      personnelId: person?.id,
      personnelName: person?.name,
      customer: { fullName: contact.fullName.trim(), phone: contact.phone.trim(), email: contact.email.trim() },
      notes: notes.trim() || undefined,
      accountEmail: user?.email
    });
    router.push(`/salon/appointment/${appt.reference}`);
  };

  return {
    serviceSlug, service, selectService, date, selectDate, time, setTime, slots, personnelId, setPersonnelId,
    contact, setContact, notes, setNotes, errors, submitting, submit, signedIn: !!user
  };
}