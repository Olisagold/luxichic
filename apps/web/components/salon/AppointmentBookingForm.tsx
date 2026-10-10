'use client';

import React from 'react';
import Link from 'next/link';
import { InfoIcon } from 'lucide-react';
import { AppointmentCalendar } from '@/components/salon/AppointmentCalendar';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/FormField';
import { useAppointmentBooking } from '@/hooks/useAppointmentBooking';
import { useCatalog } from '@/components/storefront/StorefrontProvider';
import { formatLongDate, formatSlot } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';

interface AppointmentBookingFormProps {
  initialService?: string;
  /** Hide the service picker (used on individual service pages). */
  lockService?: boolean;
}

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-3 text-sm font-semibold text-ink">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] text-white">{n}</span>
      {children}
    </h3>
  );
}

export function AppointmentBookingForm({ initialService, lockService }: AppointmentBookingFormProps) {
  const b = useAppointmentBooking(initialService);
  const { services: salonServices } = useCatalog();
  let n = 0;

  return (
    <form onSubmit={b.submit} noValidate className="space-y-8">
      {!lockService && (
        <div className="space-y-3">
          <StepLabel n={++n}>Choose a service</StepLabel>
          <SelectField
            id="bk-service"
            label="Service"
            value={b.serviceSlug}
            error={b.errors.service}
            placeholder="Select a service"
            onChange={(e) => b.selectService(e.target.value)}
            options={salonServices.map((s) => ({ value: s.slug, label: s.name }))}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <StepLabel n={++n}>Pick a date</StepLabel>
          <AppointmentCalendar value={b.date} onChange={b.selectDate} />
          {b.errors.date && (
            <p className="text-xs text-red-700" role="alert">
              {b.errors.date}
            </p>
          )}
        </div>
        <div className="space-y-3">
          <StepLabel n={++n}>Select a time</StepLabel>
          {!b.date || !b.serviceSlug ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-subtle">
              {!b.serviceSlug
                ? 'Choose a service first to see available times.'
                : 'Choose a date to see available times.'}
            </p>
          ) : (
            <>
              <p className="text-xs text-subtle">{formatLongDate(b.date)}</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Available times">
                {b.slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    role="radio"
                    aria-checked={b.time === s.time}
                    disabled={!s.available}
                    onClick={() => b.setTime(s.time)}
                    className={cn(
                      'h-11 rounded-xl border text-sm tabular-nums transition-colors duration-150',
                      b.time === s.time ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink',
                      !s.available &&
                        'cursor-not-allowed border-transparent bg-ivory text-muted line-through hover:border-transparent',
                    )}
                  >
                    {formatSlot(s.time)}
                  </button>
                ))}
              </div>
            </>
          )}
          {b.errors.time && (
            <p className="text-xs text-red-700" role="alert">
              {b.errors.time}
            </p>
          )}

          {b.service && b.service.personnel.length > 0 && (
            <div className="pt-4">
              <SelectField
                id="bk-person"
                label="Preferred specialist (optional)"
                value={b.personnelId}
                onChange={(e) => b.setPersonnelId(e.target.value)}
                options={[
                  { value: '', label: 'No preference' },
                  ...b.service.personnel.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <StepLabel n={++n}>Your details</StepLabel>
        {!b.signedIn && (
          <p className="text-xs text-subtle">
            Booking as a guest.{' '}
            <Link
              href="/login?redirect=/salon/book"
              className="font-semibold text-pink-deep underline-offset-4 hover:underline"
            >
              Sign in
            </Link>{' '}
            to use your saved details.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="bk-name"
            label="Full name"
            autoComplete="name"
            value={b.contact.fullName}
            error={b.errors.fullName}
            wrapperClassName="sm:col-span-2"
            onChange={(e) => b.setContact({ ...b.contact, fullName: e.target.value })}
          />
          <TextField
            id="bk-phone"
            type="tel"
            label="Phone number"
            autoComplete="tel"
            value={b.contact.phone}
            error={b.errors.phone}
            onChange={(e) => b.setContact({ ...b.contact, phone: e.target.value })}
          />
          <TextField
            id="bk-email"
            type="email"
            label="Email address"
            autoComplete="email"
            value={b.contact.email}
            error={b.errors.email}
            onChange={(e) => b.setContact({ ...b.contact, email: e.target.value })}
          />
          <TextAreaField
            id="bk-notes"
            label="Additional notes"
            optional
            wrapperClassName="sm:col-span-2"
            value={b.notes}
            onChange={(e) => b.setNotes(e.target.value)}
            placeholder="Style ideas, allergies, anything we should know"
          />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-blush/60 p-4 text-sm text-ink">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>No payment is needed to book. You only pay after your service has been provided.</p>
      </div>

      <Button type="submit" size="lg" fullWidth loading={b.submitting}>
        Request Appointment
      </Button>
    </form>
  );
}
