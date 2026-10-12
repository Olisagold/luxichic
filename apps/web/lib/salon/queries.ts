import 'server-only';
import { asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { deviceRecordIds } from '@/lib/auth/device-records';
import { authReady } from '@/lib/auth/helpers';
import { getCustomer } from '@/lib/auth/session';
import { toMinutes } from '@/lib/salon/availability';
import { ACTIVE_STATUSES, lagosNow } from '@/lib/salon/schedule';
import type { Appointment, AppointmentStatus } from '@/types/salon';

/** Appointments from the database, in the shape the storefront's views use. Callers check who may see them. */

const statusLabel: Record<(typeof s.appointmentStatus.enumValues)[number], AppointmentStatus> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};
const hhmm = (t: string) => t.slice(0, 5);

async function loadAppointments(
  where: SQL | undefined,
): Promise<(Appointment & { id: string; userId: string | null })[]> {
  const rows = await db
    .select({ a: s.appointments, slug: s.services.slug })
    .from(s.appointments)
    .leftJoin(s.services, eq(s.services.id, s.appointments.serviceId))
    .where(where)
    .orderBy(desc(s.appointments.date), desc(s.appointments.time));
  if (!rows.length) return [];
  const events = await db
    .select()
    .from(s.appointmentEvents)
    .where(
      inArray(
        s.appointmentEvents.appointmentId,
        rows.map((r) => r.a.id),
      ),
    )
    .orderBy(asc(s.appointmentEvents.createdAt));

  return rows.map(({ a, slug }) => ({
    id: a.id,
    userId: a.userId,
    reference: a.reference,
    serviceSlug: slug ?? '',
    serviceName: a.serviceName,
    date: a.date,
    time: hhmm(a.time),
    personnelId: a.specialistId ?? undefined,
    personnelName: a.specialistName ?? undefined,
    customer: { fullName: a.customerName, email: a.customerEmail, phone: a.customerPhone },
    notes: a.notes ?? undefined,
    status: statusLabel[a.status],
    createdAt: a.createdAt.toISOString(),
    accountEmail: a.userId ? a.customerEmail : undefined,
    reason: a.reason ?? undefined,
    original:
      a.originalDate && a.originalTime
        ? { date: a.originalDate, time: hhmm(a.originalTime), personnelName: a.originalSpecialistName ?? undefined }
        : undefined,
    history: events
      .filter((e) => e.appointmentId === a.id)
      .map((e) => ({ at: e.createdAt.toISOString(), label: e.label, note: e.note ?? undefined })),
  }));
}

const byReference = (reference: string) => sql`upper(${s.appointments.reference}) = upper(${reference.trim()})`;

/**
 * An appointment for its own page: only for the account that booked it or the browser that booked it
 * (`lx_appointments` cookie). Everyone else gets null.
 */
export async function getAppointmentForViewer(
  reference: string,
): Promise<(Appointment & { id: string; userId: string | null }) | null> {
  if (!authReady() || reference.length > 20) return null;
  const [appt] = await loadAppointments(byReference(reference));
  if (!appt) return null;
  const customer = await getCustomer();
  const allowed =
    (customer && appt.userId === customer.id) || (await deviceRecordIds('lx_appointments')).includes(appt.id);
  return allowed ? appt : null;
}

/** The signed-in customer's appointments, latest date first. */
export async function getCustomerAppointments(): Promise<Appointment[]> {
  if (!authReady()) return [];
  const customer = await getCustomer();
  if (!customer) return [];
  return loadAppointments(eq(s.appointments.userId, customer.id));
}

/**
 * Whether the customer can still cancel or reschedule online: the appointment is active and hasn't started
 * (business rule: docs/business-rules/salon.md).
 */
export function canManage(appt: Pick<Appointment, 'status' | 'date' | 'time'>): boolean {
  if (!(ACTIVE_STATUSES as readonly string[]).includes(appt.status.toLowerCase())) return false;
  const { today, now } = lagosNow();
  return appt.date > today || (appt.date === today && toMinutes(appt.time) > now);
}
