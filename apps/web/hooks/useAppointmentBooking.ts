import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCatalog } from '@/components/storefront/StorefrontProvider';
import { bookAppointment, getAvailability } from '@/lib/salon/actions';
import type { Availability } from '@/lib/salon/availability';
import { isValidEmail, isValidPhone } from '@/lib/utils/validation';

export function useAppointmentBooking(initialService?: string) {
  const { user } = useAuth();
  const router = useRouter();
  const { findService } = useCatalog();

  const [serviceSlug, setServiceSlug] = useState(initialService ?? '');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [personnelId, setPersonnelId] = useState('');
  const [contact, setContact] = useState({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
  });
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialService) setServiceSlug(initialService);
  }, [initialService]);

  useEffect(() => {
    if (user)
      setContact((c) => ({
        fullName: c.fullName || user.fullName,
        phone: c.phone || user.phone,
        email: c.email || user.email,
      }));
    // Only prefill when a different customer signs in, not on every profile edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const service = findService(serviceSlug);

  // Days and times are worked out on the server from the specialists' hours and existing bookings.
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let stale = false;
    setAvailability(null);
    getAvailability(serviceSlug || null, personnelId || null)
      .then((a) => !stale && setAvailability(a ?? { days: {}, slots: {} }))
      .catch(() => !stale && setAvailability({ days: {}, slots: {} }));
    return () => {
      stale = true;
    };
  }, [serviceSlug, personnelId, reloadKey]);
  const slots = useMemo(() => (date && availability ? (availability.slots[date] ?? []) : []), [date, availability]);

  const selectPersonnel = (id: string) => {
    setPersonnelId(id);
    setTime(null);
  };
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
    if (!isValidEmail(contact.email)) errs.email = 'Please enter a valid email address.';
    setErrors(errs);
    if (Object.keys(errs).length || !service || !date || !time) return;
    setSubmitting(true);
    try {
      const res = await bookAppointment({
        serviceSlug: service.slug,
        date,
        time,
        specialistId: personnelId || null,
        customer: { fullName: contact.fullName.trim(), phone: contact.phone.trim(), email: contact.email.trim() },
        notes: notes.trim() || undefined,
      });
      if (res.ok && res.reference) return router.push(`/salon/appointment/${res.reference}`);
      if (res.taken) {
        setTime(null);
        setReloadKey((k) => k + 1);
        setErrors({ time: res.error ?? 'That time is no longer available. Please choose another.' });
      } else setErrors({ form: res.error ?? 'We could not book your appointment. Please try again.' });
    } catch {
      setErrors({ form: 'We could not book your appointment. Please check your connection and try again.' });
    }
    setSubmitting(false);
  };

  return {
    serviceSlug,
    service,
    selectService,
    date,
    selectDate,
    time,
    setTime,
    slots,
    days: availability?.days ?? null,
    loadingTimes: !!serviceSlug && !availability,
    personnelId,
    setPersonnelId: selectPersonnel,
    contact,
    setContact,
    notes,
    setNotes,
    errors,
    submitting,
    submit,
    signedIn: !!user,
  };
}
