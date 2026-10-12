'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClockIcon, XCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentCalendar } from '@/components/salon/AppointmentCalendar';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/FormField';
import { useCatalog } from '@/components/storefront/StorefrontProvider';
import { cancelAppointment, getRescheduleAvailability, rescheduleAppointment } from '@/lib/salon/actions';
import type { Availability } from '@/lib/salon/availability';
import { formatLongDate, formatSlot } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';
import type { Appointment } from '@/types/salon';

/** Cancel or reschedule an appointment (any time before it starts; a new time goes back to Pending). */
export function ManageAppointment({ appointment }: { appointment: Appointment }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'cancel' | 'reschedule'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cancel = async () => {
    setBusy(true);
    setError('');
    const res = await cancelAppointment(appointment.reference).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(res?.error ?? 'We could not cancel your appointment. Please try again.');
    toast.success('Your appointment has been cancelled');
    setMode('idle');
    router.refresh();
  };

  return (
    <section className="mt-6 rounded-[28px] bg-white p-6 md:p-8" aria-labelledby="manage-heading">
      <h2 id="manage-heading" className="font-display text-3xl text-ink">
        Need to change something?
      </h2>
      <p className="mt-2 text-sm text-subtle">
        You can reschedule or cancel any time before your appointment. A new time needs the salon to confirm it again.
      </p>

      {mode === 'idle' && (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setMode('reschedule')}>
            <CalendarClockIcon className="h-4 w-4" aria-hidden /> Reschedule
          </Button>
          <Button variant="ghost" onClick={() => setMode('cancel')}>
            <XCircleIcon className="h-4 w-4" aria-hidden /> Cancel appointment
          </Button>
        </div>
      )}

      {mode === 'cancel' && (
        <div className="mt-5 rounded-2xl bg-ivory p-5">
          <p className="text-sm text-ink">
            Cancel your {appointment.serviceName} on {formatLongDate(appointment.date)} at{' '}
            {formatSlot(appointment.time)}?
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={cancel} loading={busy}>
              Yes, cancel it
            </Button>
            <Button variant="ghost" onClick={() => setMode('idle')} disabled={busy}>
              Keep my appointment
            </Button>
          </div>
        </div>
      )}

      {mode === 'reschedule' && (
        <ReschedulePicker
          appointment={appointment}
          onDone={() => {
            setMode('idle');
            router.refresh();
          }}
          onClose={() => setMode('idle')}
        />
      )}

      {error && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function ReschedulePicker({
  appointment,
  onDone,
  onClose,
}: {
  appointment: Appointment;
  onDone: () => void;
  onClose: () => void;
}) {
  const personnel = useCatalog().findService(appointment.serviceSlug)?.personnel ?? [];
  const [personnelId, setPersonnelId] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let stale = false;
    setAvailability(null);
    getRescheduleAvailability(appointment.reference, personnelId || null)
      .then((a) => !stale && setAvailability(a ?? { days: {}, slots: {} }))
      .catch(() => !stale && setAvailability({ days: {}, slots: {} }));
    return () => {
      stale = true;
    };
  }, [appointment.reference, personnelId, reloadKey]);

  const slots = date && availability ? (availability.slots[date] ?? []) : [];

  const save = async () => {
    if (!date || !time) return setError('Please choose a new date and time.');
    setBusy(true);
    setError('');
    const res = await rescheduleAppointment(appointment.reference, {
      date,
      time,
      specialistId: personnelId || null,
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      toast.success('Your appointment has been moved', { description: 'The salon will confirm the new time.' });
      return onDone();
    }
    if (res?.taken) {
      setTime(null);
      setReloadKey((k) => k + 1);
    }
    setError(res?.error ?? 'We could not reschedule your appointment. Please try again.');
  };

  return (
    <div className="mt-5 space-y-5">
      {personnel.length > 0 && (
        <SelectField
          id="rs-person"
          label="Specialist"
          value={personnelId}
          onChange={(e) => {
            setPersonnelId(e.target.value);
            setTime(null);
          }}
          options={[{ value: '', label: 'No preference' }, ...personnel.map((p) => ({ value: p.id, label: p.name }))]}
        />
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AppointmentCalendar
          value={date}
          onChange={(d) => {
            setDate(d);
            setTime(null);
          }}
          days={availability?.days ?? null}
        />
        <div>
          {!date ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-subtle">
              Choose a new date to see available times.
            </p>
          ) : !availability ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-subtle" aria-busy="true">
              Checking available times…
            </p>
          ) : !slots.some((s) => s.available) ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-subtle">
              No times left on {formatLongDate(date)}. Please choose another day.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="New time">
              {slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  role="radio"
                  aria-checked={time === s.time}
                  disabled={!s.available}
                  onClick={() => setTime(s.time)}
                  className={cn(
                    'h-11 rounded-xl border text-sm tabular-nums transition-colors duration-150',
                    time === s.time ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink',
                    !s.available &&
                      'cursor-not-allowed border-transparent bg-ivory text-muted line-through hover:border-transparent',
                  )}
                >
                  {formatSlot(s.time)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} loading={busy} disabled={!date || !time}>
          Confirm new time
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Keep current time
        </Button>
      </div>
    </div>
  );
}
