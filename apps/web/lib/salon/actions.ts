'use server';

import { randomInt } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import * as s from '@/db/schema';
import { rememberDeviceRecord } from '@/lib/auth/device-records';
import { authReady } from '@/lib/auth/helpers';
import { getCustomer } from '@/lib/auth/session';
import {
  computeAvailability,
  freeSpecialists,
  toMinutes,
  type Availability,
  type ScheduleInput,
  type ScheduleSpecialist,
} from '@/lib/salon/availability';
import { canManage, getAppointmentForViewer } from '@/lib/salon/queries';
import { loadSchedule } from '@/lib/salon/schedule';
import { formatLongDate, formatSlot } from '@/lib/utils/dates';
import { isUuid, isValidEmail, isValidPhone } from '@/lib/utils/validation';
import type { Result } from '@/types/user';

const UNAVAILABLE: Result = { ok: false, error: 'Booking is not available right now. Please try again later.' };
const TAKEN = 'That time is no longer available. Please choose another.';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const slotSchema = z.object({
  date: z.string().regex(DATE),
  time: z.string().regex(TIME),
  specialistId: z.string().nullish(),
});
const field = (max: number) => z.string().trim().max(max);
const bookSchema = slotSchema.extend({
  serviceSlug: z.string().min(1).max(100),
  customer: z.object({ fullName: field(120), email: field(254), phone: field(30) }),
  notes: field(1000).optional(),
});

/** The Postgres error code (and constraint) behind a database error. */
function pgError(e: unknown): { code?: string; constraint?: string } {
  for (let err = e as { code?: string; constraint_name?: string; cause?: unknown } | undefined; err;) {
    if (err.code && /^[0-9A-Z]{5}$/.test(err.code)) return { code: err.code, constraint: err.constraint_name };
    err = err.cause as typeof err;
  }
  return {};
}
const DOUBLE_BOOKED = '23P01';

const newAppointmentReference = () => `APT-${randomInt(100_000, 1_000_000)}`;

/**
 * Who can take [date time]: the chosen specialist, or (no preference) anyone free, preferring `prefer` and then
 * whoever has the fewest bookings that day.
 */
function candidates(
  input: ScheduleInput,
  date: string,
  time: string,
  specialistId?: string | null,
  prefer?: string | null,
): ScheduleSpecialist[] {
  const free = freeSpecialists(input, date, toMinutes(time));
  if (specialistId) return free.filter((sp) => sp.id === specialistId);
  const load = (id: string) => input.booked.filter((b) => b.specialistId === id && b.date === date).length;
  return [...free].sort((a, b) => Number(b.id === prefer) - Number(a.id === prefer) || load(a.id) - load(b.id));
}

/** Days and start times for a service (any specialist, or one). With no service, which days the salon opens. */
export async function getAvailability(
  serviceSlug: string | null,
  specialistId?: string | null,
): Promise<Availability | null> {
  if (!authReady()) return null;
  if (serviceSlug !== null && (typeof serviceSlug !== 'string' || serviceSlug.length > 100)) return null;
  const schedule = await loadSchedule(serviceSlug || null);
  if (!schedule) return null;
  const availability = computeAvailability(schedule.input, isUuid(specialistId) ? specialistId : null);
  return schedule.service ? availability : { days: availability.days, slots: {} };
}

/**
 * Books an appointment request. Availability is checked again on the server, and the database refuses a time
 * that overlaps another active booking for the same specialist (two customers clicking at once): then the next
 * free specialist is tried, or the customer is asked to pick another time.
 */
export async function bookAppointment(
  input: z.input<typeof bookSchema>,
): Promise<Result & { reference?: string; taken?: boolean }> {
  if (!authReady()) return UNAVAILABLE;
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Please check your booking details and try again.' };
  const d = parsed.data;
  if (d.customer.fullName.length < 2) return { ok: false, error: 'Please enter your full name.' };
  if (!isValidEmail(d.customer.email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!isValidPhone(d.customer.phone)) return { ok: false, error: 'Please enter a valid phone number.' };

  const customer = await getCustomer();
  if (!customer) {
    const [blocked] = await db
      .select({ id: s.profiles.id })
      .from(s.profiles)
      .where(and(sql`lower(${s.profiles.email}) = lower(${d.customer.email})`, eq(s.profiles.status, 'blocked')));
    if (blocked)
      return { ok: false, error: 'This account can’t book appointments right now. Please contact LUXICHIC.' };
  }

  const schedule = await loadSchedule(d.serviceSlug);
  if (!schedule?.service) return { ok: false, error: 'This service can’t be booked online right now.' };
  const service = schedule.service;
  const people = candidates(schedule.input, d.date, d.time, isUuid(d.specialistId) ? d.specialistId : null);

  for (const person of people) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const reference = newAppointmentReference();
        const id = await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(s.appointments)
            .values({
              reference,
              serviceId: service.id,
              serviceName: service.name,
              specialistId: person.id,
              specialistName: person.name,
              date: d.date,
              time: d.time,
              durationMinutes: service.durationMinutes,
              userId: customer?.id ?? null,
              customerName: d.customer.fullName,
              customerEmail: d.customer.email,
              customerPhone: d.customer.phone,
              notes: d.notes || null,
            })
            .returning({ id: s.appointments.id });
          await tx.insert(s.appointmentEvents).values({ appointmentId: row.id, label: 'Appointment requested' });
          return row.id;
        });
        await rememberDeviceRecord('lx_appointments', id);
        return { ok: true, reference };
      } catch (e) {
        const { code, constraint } = pgError(e);
        if (code === DOUBLE_BOOKED) break; // someone just took this specialist: try the next one
        if (code === '23505' && constraint?.includes('reference')) continue;
        throw e;
      }
    }
  }
  return { ok: false, taken: true, error: TAKEN };
}

/* ------------------------------------------------------------------ */
/* Managing a booking (business rule: docs/business-rules/salon.md)    */
/* ------------------------------------------------------------------ */

/** The viewer's appointment if they can still cancel or reschedule it. */
async function manageable(reference: string) {
  if (typeof reference !== 'string') return null;
  const appt = await getAppointmentForViewer(reference);
  return appt && canManage(appt) ? appt : null;
}

const NOT_MANAGEABLE: Result = {
  ok: false,
  error: 'This appointment can’t be changed online any more. Please contact the salon on WhatsApp.',
};

/** Free times for moving the viewer's appointment (its own time counts as free). */
export async function getRescheduleAvailability(
  reference: string,
  specialistId?: string | null,
): Promise<Availability | null> {
  if (!authReady()) return null;
  const appt = await manageable(reference);
  if (!appt?.serviceSlug) return null;
  const schedule = await loadSchedule(appt.serviceSlug, appt.id);
  return schedule ? computeAvailability(schedule.input, isUuid(specialistId) ? specialistId : null) : null;
}

/** Customers can cancel any time before the appointment starts. */
export async function cancelAppointment(reference: string): Promise<Result> {
  if (!authReady()) return UNAVAILABLE;
  const appt = await manageable(reference);
  if (!appt) return NOT_MANAGEABLE;
  await db.transaction(async (tx) => {
    await tx
      .update(s.appointments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(s.appointments.id, appt.id));
    await tx.insert(s.appointmentEvents).values({ appointmentId: appt.id, label: 'Cancelled by customer' });
  });
  return { ok: true };
}

/**
 * Moves the appointment to a new time any time before it starts. It goes back to Pending for the salon to
 * confirm again. With no specialist chosen, the current one is kept if they're free.
 */
export async function rescheduleAppointment(
  reference: string,
  slot: z.input<typeof slotSchema>,
): Promise<Result & { taken?: boolean }> {
  if (!authReady()) return UNAVAILABLE;
  const parsed = slotSchema.safeParse(slot);
  if (!parsed.success) return { ok: false, error: 'Please choose a new date and time.' };
  const appt = await manageable(reference);
  if (!appt?.serviceSlug) return NOT_MANAGEABLE;
  const schedule = await loadSchedule(appt.serviceSlug, appt.id);
  if (!schedule?.service) return { ok: false, error: 'This service can’t be booked online right now.' };
  const { date, time } = parsed.data;
  const chosen = isUuid(parsed.data.specialistId) ? parsed.data.specialistId : null;
  const people = candidates(schedule.input, date, time, chosen, appt.personnelId);
  const from = `${formatLongDate(appt.date)} at ${formatSlot(appt.time)}`;

  for (const person of people) {
    try {
      await db.transaction(async (tx) => {
        await tx
          .update(s.appointments)
          .set({
            date,
            time,
            specialistId: person.id,
            specialistName: person.name,
            durationMinutes: schedule.service!.durationMinutes,
            status: 'pending',
            reason: null,
            updatedAt: new Date(),
          })
          .where(eq(s.appointments.id, appt.id));
        await tx.insert(s.appointmentEvents).values({
          appointmentId: appt.id,
          label: 'Rescheduled by customer',
          note: `From ${from} to ${formatLongDate(date)} at ${formatSlot(time)}`,
        });
      });
      return { ok: true };
    } catch (e) {
      if (pgError(e).code === DOUBLE_BOOKED) continue;
      throw e;
    }
  }
  return { ok: false, taken: true, error: TAKEN };
}
