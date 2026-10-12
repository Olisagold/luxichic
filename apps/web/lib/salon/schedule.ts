import 'server-only';
import { and, asc, eq, gte, inArray, isNull, lte, ne, or } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import {
  BOOKING_WINDOW_DAYS,
  addDays,
  toMinutes,
  type ScheduleInput,
  type ScheduleSpecialist,
} from '@/lib/salon/availability';

/** Appointments in these states hold their time (the same list as the no-double-booking constraint). */
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'rescheduled'] as const;

/** Today's date and the time now at the salon. */
export function lagosNow(): { today: string; now: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { today: `${parts.year}-${parts.month}-${parts.day}`, now: Number(parts.hour) * 60 + Number(parts.minute) };
}

export interface BookableService {
  id: string;
  slug: string;
  name: string;
  durationMinutes: number;
}

/**
 * Everything availability needs for one service, straight from the database (bookings change constantly, so
 * nothing is cached). With no service, the salon as a whole: which days anyone works. `exceptAppointmentId`
 * leaves an appointment out of the booked times (when rescheduling it). Null if the service can't be booked.
 */
export async function loadSchedule(
  serviceSlug: string | null,
  exceptAppointmentId?: string,
): Promise<{ service: BookableService | null; input: ScheduleInput } | null> {
  const { today, now } = lagosNow();
  const until = addDays(today, BOOKING_WINDOW_DAYS);

  let service: BookableService | null = null;
  if (serviceSlug) {
    const [row] = await db
      .select({
        id: s.services.id,
        slug: s.services.slug,
        name: s.services.name,
        durationMinutes: s.services.durationMinutes,
      })
      .from(s.services)
      .where(and(eq(s.services.slug, serviceSlug), eq(s.services.status, 'published'), eq(s.services.bookable, true)));
    if (!row) return null;
    service = row;
  }

  const specialistRows = service
    ? await db
        .select({ id: s.specialists.id, name: s.specialists.name })
        .from(s.specialistServices)
        .innerJoin(s.specialists, eq(s.specialists.id, s.specialistServices.specialistId))
        .where(and(eq(s.specialistServices.serviceId, service.id), eq(s.specialists.status, 'active')))
        .orderBy(asc(s.specialists.name))
    : await db
        .select({ id: s.specialists.id, name: s.specialists.name })
        .from(s.specialists)
        .where(eq(s.specialists.status, 'active'))
        .orderBy(asc(s.specialists.name));
  const ids = specialistRows.map((r) => r.id);

  const hours = ids.length
    ? await db.select().from(s.availability).where(inArray(s.availability.specialistId, ids))
    : [];
  const specialists: ScheduleSpecialist[] = specialistRows.map((r) => ({
    id: r.id,
    name: r.name,
    hours: Object.fromEntries(
      hours
        .filter((h) => h.specialistId === r.id)
        .map((h) => [h.weekday, { start: toMinutes(h.startTime), end: toMinutes(h.endTime) }]),
    ),
  }));

  const blocks = await db
    .select()
    .from(s.blocks)
    .where(
      and(
        gte(s.blocks.date, today),
        lte(s.blocks.date, until),
        service ? or(isNull(s.blocks.serviceId), eq(s.blocks.serviceId, service.id)) : isNull(s.blocks.serviceId),
      ),
    );

  const booked = ids.length
    ? await db
        .select({
          specialistId: s.appointments.specialistId,
          date: s.appointments.date,
          time: s.appointments.time,
          durationMinutes: s.appointments.durationMinutes,
        })
        .from(s.appointments)
        .where(
          and(
            inArray(s.appointments.specialistId, ids),
            gte(s.appointments.date, today),
            lte(s.appointments.date, until),
            inArray(s.appointments.status, [...ACTIVE_STATUSES]),
            exceptAppointmentId ? ne(s.appointments.id, exceptAppointmentId) : undefined,
          ),
        )
    : [];

  return {
    service,
    input: {
      today,
      now,
      windowDays: BOOKING_WINDOW_DAYS,
      durationMinutes: service?.durationMinutes ?? 60,
      specialists,
      blocks: blocks.map((b) => ({
        date: b.date,
        start: b.startTime ? toMinutes(b.startTime) : null,
        end: b.endTime ? toMinutes(b.endTime) : null,
        specialistId: b.specialistId,
      })),
      booked: booked.map((b) => {
        const start = toMinutes(b.time);
        return { specialistId: b.specialistId!, date: b.date, start, end: start + b.durationMinutes };
      }),
    },
  };
}
