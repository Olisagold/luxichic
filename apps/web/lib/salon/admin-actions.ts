'use server';

import { and, eq, inArray, max, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import * as s from '@/db/schema';
import { ActionError, adminAction, audit } from '@/lib/auth/admin-action';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { computeAvailability, freeSpecialists, toMinutes, type Slot } from '@/lib/salon/availability';
import { ACTIVE_STATUSES, loadSchedule } from '@/lib/salon/schedule';
import { STOREFRONT_TAG } from '@/lib/storefront/data';
import { formatLongDate, formatSlot } from '@/lib/utils/dates';
import { slugify } from '@/lib/utils/text';
import { isUuid } from '@/lib/utils/validation';
import type { AdminService, AdminUser, Specialist } from '@/types/admin';
import type { Result } from '@/types/user';

/**
 * Admin salon actions. Each checks its permission on the server and writes to `audit_logs`. Services,
 * specialists and closed days also refresh the storefront (they shape what customers can book). Customer emails
 * about appointment changes come in Phase 9.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Status = (typeof s.appointmentStatus.enumValues)[number];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const DOUBLE_BOOKED = '23P01';
const pgCode = (e: unknown): string | undefined => {
  for (let err = e as { code?: string; cause?: unknown } | undefined; err; err = err.cause as typeof err) {
    if (err.code && /^[0-9A-Z]{5}$/.test(err.code)) return err.code;
  }
};

/* ------------------------------------------------------------------ */
/* Appointments                                                        */
/* ------------------------------------------------------------------ */

async function lockAppointment(tx: Tx, reference: string) {
  if (typeof reference !== 'string' || reference.length > 20) throw new ActionError('Appointment not found.');
  const [row] = await tx
    .select()
    .from(s.appointments)
    .where(sql`upper(${s.appointments.reference}) = upper(${reference.trim()})`)
    .for('update');
  if (!row) throw new ActionError('Appointment not found.');
  return row;
}

async function logAppointment(tx: Tx, admin: AdminUser, action: string, reference: string, detail?: string) {
  await audit(tx, admin, {
    section: 'Appointments',
    action,
    target: detail ? `${reference} · ${detail}` : reference,
    link: `/admin/appointments?ref=${reference}`,
  });
}

/** Moves an appointment from one of `from` to `to`, with a history entry and an audit entry. */
async function decide(
  permission: 'appointments.confirm' | 'appointments.reject',
  reference: string,
  from: Status[],
  to: Status,
  label: string,
  reason?: string,
): Promise<Result> {
  return adminAction(permission, async (admin) => {
    const why = reason === undefined ? undefined : String(reason).trim().slice(0, 500);
    if (why !== undefined && why.length < 3) throw new ActionError('Please give a reason.');
    await db.transaction(async (tx) => {
      const a = await lockAppointment(tx, reference);
      if (!from.includes(a.status)) throw new ActionError(`This appointment is ${a.status} and can’t be ${to} now.`);
      await tx
        .update(s.appointments)
        .set({ status: to, ...(why ? { reason: why } : {}), updatedAt: new Date() })
        .where(eq(s.appointments.id, a.id));
      await tx.insert(s.appointmentEvents).values({ appointmentId: a.id, label, note: why, adminId: admin.id });
      await logAppointment(tx, admin, `${label} appointment`, a.reference, why);
    });
    return { ok: true };
  });
}

export async function confirmAppointment(reference: string): Promise<Result> {
  return decide('appointments.confirm', reference, ['pending', 'rescheduled'], 'confirmed', 'Confirmed');
}

export async function completeAppointment(reference: string): Promise<Result> {
  return decide('appointments.confirm', reference, ['confirmed', 'rescheduled'], 'completed', 'Completed');
}

export async function rejectAppointment(reference: string, reason: string): Promise<Result> {
  return decide('appointments.reject', reference, ['pending'], 'rejected', 'Rejected', reason ?? '');
}

export async function cancelAppointment(reference: string, reason: string): Promise<Result> {
  return decide('appointments.reject', reference, [...ACTIVE_STATUSES], 'cancelled', 'Cancelled', reason ?? '');
}

/** Free start times on `date` for moving this appointment (its own time counts as free). */
export async function adminRescheduleSlots(
  reference: string,
  date: string,
  specialistId?: string | null,
): Promise<Slot[]> {
  const admin = await getAdmin();
  if (!admin || !hasPermission(admin, 'appointments.reschedule') || !DATE.test(String(date))) return [];
  const [a] = await db
    .select({ id: s.appointments.id, serviceSlug: s.services.slug })
    .from(s.appointments)
    .leftJoin(s.services, eq(s.services.id, s.appointments.serviceId))
    .where(sql`upper(${s.appointments.reference}) = upper(${String(reference).trim()})`);
  if (!a?.serviceSlug) return [];
  const schedule = await loadSchedule(a.serviceSlug, a.id);
  if (!schedule) return [];
  return computeAvailability(schedule.input, isUuid(specialistId) ? specialistId : null).slots[date] ?? [];
}

/**
 * Moves an appointment (status Rescheduled), keeping the originally requested time. The database refuses a
 * time that overlaps another active booking for the same specialist.
 */
export async function rescheduleAppointment(
  reference: string,
  next: { date: string; time: string; specialistId?: string | null; reason: string },
): Promise<Result> {
  return adminAction('appointments.reschedule', async (admin) => {
    const reason = String(next?.reason ?? '')
      .trim()
      .slice(0, 500);
    if (!DATE.test(String(next?.date)) || !TIME.test(String(next?.time)))
      throw new ActionError('Choose a date and time.');
    if (reason.length < 3) throw new ActionError('Please give a reason.');
    try {
      await db.transaction(async (tx) => {
        const a = await lockAppointment(tx, reference);
        if (!(ACTIVE_STATUSES as readonly string[]).includes(a.status)) {
          throw new ActionError(`This appointment is ${a.status} and can’t be moved.`);
        }
        let specialist = a.specialistId ? { id: a.specialistId, name: a.specialistName } : null;
        if (isUuid(next.specialistId) && next.specialistId !== a.specialistId) {
          const [sp] = await tx
            .select({ id: s.specialists.id, name: s.specialists.name })
            .from(s.specialists)
            .where(eq(s.specialists.id, next.specialistId));
          if (!sp) throw new ActionError('Specialist not found.');
          specialist = sp;
        } else if (!next.specialistId && a.serviceId) {
          // No preference: keep the current specialist if they're free then, otherwise anyone free.
          const [svc] = await tx
            .select({ slug: s.services.slug })
            .from(s.services)
            .where(eq(s.services.id, a.serviceId));
          const schedule = svc && (await loadSchedule(svc.slug, a.id));
          const free = schedule ? freeSpecialists(schedule.input, next.date, toMinutes(next.time)) : [];
          const pick = free.find((x) => x.id === a.specialistId) ?? free[0];
          if (pick) specialist = { id: pick.id, name: pick.name };
        }
        await tx
          .update(s.appointments)
          .set({
            status: 'rescheduled',
            date: next.date,
            time: next.time,
            specialistId: specialist?.id ?? null,
            specialistName: specialist?.name ?? null,
            reason,
            // The time the customer first asked for, kept across later moves.
            originalDate: a.originalDate ?? a.date,
            originalTime: a.originalTime ?? a.time,
            originalSpecialistName: a.originalDate ? a.originalSpecialistName : a.specialistName,
            updatedAt: new Date(),
          })
          .where(eq(s.appointments.id, a.id));
        const to = `${formatLongDate(next.date)} at ${formatSlot(next.time)}`;
        await tx
          .insert(s.appointmentEvents)
          .values({ appointmentId: a.id, label: `Rescheduled to ${to}`, note: reason, adminId: admin.id });
        await logAppointment(tx, admin, 'Rescheduled appointment', a.reference, `→ ${next.date} ${next.time}`);
      });
    } catch (e) {
      if (pgCode(e) === DOUBLE_BOOKED) throw new ActionError('That specialist is already booked at that time.');
      throw e;
    }
    return { ok: true };
  });
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

/** Optional text: empty, null or missing all mean "none". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v ?? '');

const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Enter a service name.').max(120),
  category: z.string().trim().min(1, 'Choose a category.').max(60),
  shortDescription: optionalText(300),
  description: optionalText(5000),
  includes: z
    .array(z.string().trim().max(200))
    .max(30)
    .nullish()
    .transform((v) => v ?? []),
  startingPrice: z.number().int().min(0).nullable(),
  duration: optionalText(60),
  durationMinutes: z.number().int().min(5, 'Enter the length in minutes.').max(600),
  image: optionalText(1000),
  whatsapp: optionalText(30),
  status: z.enum(['published', 'draft', 'archived']),
  bookable: z.boolean(),
});

const serviceLink = (slug: string) => `/admin/salon/services/${slug}`;

/** Creates a service, or saves one (found by `originalSlug`). The URL slug comes from the name for new ones. */
export async function saveService(input: AdminService, originalSlug?: string): Promise<Result & { slug?: string }> {
  return adminAction(
    'salon.services',
    async (admin) => {
      const parsed = serviceSchema.safeParse({ ...input, startingPrice: input?.startingPrice ?? null });
      if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? 'Please check the fields.');
      const d = parsed.data;
      if (d.image && !/^(https:\/\/|\/)/.test(d.image)) throw new ActionError('Upload the image again.');
      const values = {
        name: d.name,
        category: d.category,
        shortDescription: d.shortDescription,
        description: d.description,
        includes: d.includes.filter(Boolean),
        startingPrice: d.startingPrice,
        durationLabel: d.duration || null,
        durationMinutes: d.durationMinutes,
        imageUrl: d.image || null,
        whatsapp: d.whatsapp || null,
        status: d.status,
        bookable: d.bookable,
      };
      const slug = await db.transaction(async (tx) => {
        if (originalSlug) {
          const [row] = await tx
            .update(s.services)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(s.services.slug, String(originalSlug)))
            .returning({ slug: s.services.slug });
          if (!row) throw new ActionError('Service not found.');
          await audit(tx, admin, {
            section: 'Salon',
            action: 'Edited service',
            target: d.name,
            link: serviceLink(row.slug),
          });
          return row.slug;
        }
        const newSlug = slugify(input.slug || d.name);
        const [clash] = await tx.select({ id: s.services.id }).from(s.services).where(eq(s.services.slug, newSlug));
        if (clash) throw new ActionError('A service with this name already exists.');
        const [{ last }] = await tx.select({ last: max(s.services.sortOrder) }).from(s.services);
        await tx.insert(s.services).values({ ...values, slug: newSlug, sortOrder: (last ?? -1) + 1 });
        await audit(tx, admin, {
          section: 'Salon',
          action: 'Created service',
          target: d.name,
          link: serviceLink(newSlug),
        });
        return newSlug;
      });
      return { ok: true, slug };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

export async function setServiceStatus(slug: string, status: AdminService['status']): Promise<Result> {
  return adminAction(
    'salon.services',
    async (admin) => {
      if (!['published', 'draft', 'archived'].includes(status)) throw new ActionError('Unknown status.');
      const [row] = await db
        .update(s.services)
        .set({ status, updatedAt: new Date() })
        .where(eq(s.services.slug, String(slug)))
        .returning({ name: s.services.name });
      if (!row) throw new ActionError('Service not found.');
      const verb = status === 'published' ? 'Published' : status === 'archived' ? 'Archived' : 'Unpublished';
      await audit(db, admin, { section: 'Salon', action: `${verb} service`, target: row.name });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

/** Deletes a service. Past appointments keep its name. */
export async function deleteService(slug: string): Promise<Result> {
  return adminAction(
    'salon.services',
    async (admin) => {
      const [row] = await db
        .delete(s.services)
        .where(eq(s.services.slug, String(slug)))
        .returning({ name: s.services.name });
      if (!row) throw new ActionError('Service not found.');
      await audit(db, admin, { section: 'Salon', action: 'Deleted service', target: row.name });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

/** Adds or removes a specialist from a service (who customers can choose for it). */
export async function assignSpecialist(specialistId: string, serviceSlug: string, assigned: boolean): Promise<Result> {
  return adminAction(
    'salon.services',
    async (admin) => {
      if (!isUuid(specialistId)) throw new ActionError('Specialist not found.');
      const [service] = await db
        .select({ id: s.services.id, name: s.services.name })
        .from(s.services)
        .where(eq(s.services.slug, String(serviceSlug)));
      const [sp] = await db
        .select({ name: s.specialists.name })
        .from(s.specialists)
        .where(eq(s.specialists.id, specialistId));
      if (!service || !sp) throw new ActionError('Not found.');
      if (assigned) {
        await db.insert(s.specialistServices).values({ specialistId, serviceId: service.id }).onConflictDoNothing();
      } else {
        await db
          .delete(s.specialistServices)
          .where(
            and(eq(s.specialistServices.specialistId, specialistId), eq(s.specialistServices.serviceId, service.id)),
          );
      }
      await audit(db, admin, {
        section: 'Salon',
        action: assigned ? 'Assigned specialist' : 'Unassigned specialist',
        target: `${sp.name} · ${service.name}`,
      });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

/* ------------------------------------------------------------------ */
/* Specialists                                                         */
/* ------------------------------------------------------------------ */

const specialistSchema = z
  .object({
    id: z.string(),
    name: z.string().trim().min(2, 'Enter a name.').max(80),
    title: z.string().trim().min(1, 'Enter a title.').max(80),
    image: optionalText(1000),
    bio: optionalText(2000),
    specialties: z.array(z.string().trim().max(60)).max(20),
    serviceSlugs: z.array(z.string().max(100)).max(100),
    workingDays: z.array(z.number().int().min(0).max(6)).max(7),
    hours: z.object({ start: z.string().regex(TIME), end: z.string().regex(TIME) }),
    status: z.enum(['active', 'on-leave', 'archived']),
  })
  .refine((d) => toMinutes(d.hours.end) > toMinutes(d.hours.start), {
    message: 'Finishing time must be after starting time.',
  });

/** Creates or saves a specialist with their working days and hours and the services they perform. */
export async function saveSpecialist(input: Specialist): Promise<Result & { id?: string }> {
  return adminAction(
    'salon.specialists',
    async (admin) => {
      const parsed = specialistSchema.safeParse(input);
      if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? 'Please check the fields.');
      const d = parsed.data;
      if (d.image && !/^(https:\/\/|\/)/.test(d.image)) throw new ActionError('Upload the photo again.');
      const values = {
        name: d.name,
        title: d.title,
        imageUrl: d.image || null,
        bio: d.bio,
        specialties: d.specialties.filter(Boolean),
        status: d.status === 'on-leave' ? ('on_leave' as const) : d.status,
      };
      const id = await db.transaction(async (tx) => {
        let specialistId: string;
        if (isUuid(d.id)) {
          const [row] = await tx
            .update(s.specialists)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(s.specialists.id, d.id))
            .returning({ id: s.specialists.id });
          if (!row) throw new ActionError('Specialist not found.');
          specialistId = row.id;
        } else {
          [{ id: specialistId }] = await tx.insert(s.specialists).values(values).returning({ id: s.specialists.id });
        }
        // Working hours: one row per working day, all with the same hours.
        await tx.delete(s.availability).where(eq(s.availability.specialistId, specialistId));
        const days = [...new Set(d.workingDays)];
        if (days.length) {
          await tx
            .insert(s.availability)
            .values(days.map((weekday) => ({ specialistId, weekday, startTime: d.hours.start, endTime: d.hours.end })));
        }
        // Services they perform.
        await tx.delete(s.specialistServices).where(eq(s.specialistServices.specialistId, specialistId));
        if (d.serviceSlugs.length) {
          const services = await tx
            .select({ id: s.services.id })
            .from(s.services)
            .where(inArray(s.services.slug, d.serviceSlugs));
          if (services.length) {
            await tx.insert(s.specialistServices).values(services.map((x) => ({ specialistId, serviceId: x.id })));
          }
        }
        await audit(tx, admin, {
          section: 'Salon',
          action: isUuid(d.id) ? 'Edited specialist' : 'Added specialist',
          target: d.name,
        });
        return specialistId;
      });
      return { ok: true, id };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

/**
 * Deletes a specialist. Refused while they have upcoming active bookings (reassign or cancel those first); past
 * appointments keep their name.
 */
export async function deleteSpecialist(id: string): Promise<Result> {
  return adminAction(
    'salon.specialists',
    async (admin) => {
      if (!isUuid(id)) throw new ActionError('Specialist not found.');
      const [upcoming] = await db
        .select({ ref: s.appointments.reference })
        .from(s.appointments)
        .where(
          and(
            eq(s.appointments.specialistId, id),
            inArray(s.appointments.status, [...ACTIVE_STATUSES]),
            sql`${s.appointments.date} >= current_date`,
          ),
        )
        .limit(1);
      if (upcoming) {
        throw new ActionError(`They still have upcoming bookings (e.g. ${upcoming.ref}). Move or cancel those first.`);
      }
      const [row] = await db
        .delete(s.specialists)
        .where(eq(s.specialists.id, id))
        .returning({ name: s.specialists.name });
      if (!row) throw new ActionError('Specialist not found.');
      await audit(db, admin, { section: 'Salon', action: 'Deleted specialist', target: row.name });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

/* ------------------------------------------------------------------ */
/* Closed days and hours                                               */
/* ------------------------------------------------------------------ */

/** Closes a whole day or some hours, for the salon, one service or one specialist. */
export async function addBlock(block: {
  date: string;
  start: string | null;
  end: string | null;
  serviceSlug: string | null;
  specialistId: string | null;
  reason: string;
}): Promise<Result> {
  return adminAction(
    'salon.availability',
    async (admin) => {
      if (!DATE.test(String(block?.date))) throw new ActionError('Choose a date.');
      const timed = !!block.start || !!block.end;
      if (timed && (!TIME.test(String(block.start)) || !TIME.test(String(block.end)))) {
        throw new ActionError('Give both a start and an end time, or close the whole day.');
      }
      if (timed && toMinutes(block.end!) <= toMinutes(block.start!)) {
        throw new ActionError('The end time must be after the start time.');
      }
      let serviceId: string | null = null;
      if (block.serviceSlug) {
        const [svc] = await db
          .select({ id: s.services.id })
          .from(s.services)
          .where(eq(s.services.slug, block.serviceSlug));
        if (!svc) throw new ActionError('Service not found.');
        serviceId = svc.id;
      }
      const specialistId = isUuid(block.specialistId) ? block.specialistId : null;
      const reason = String(block.reason ?? '')
        .trim()
        .slice(0, 200);
      await db.transaction(async (tx) => {
        await tx.insert(s.blocks).values({
          date: block.date,
          startTime: timed ? block.start : null,
          endTime: timed ? block.end : null,
          serviceId,
          specialistId,
          reason,
          createdByAdminId: admin.id,
        });
        await audit(tx, admin, {
          section: 'Salon',
          action: 'Closed time',
          target: `${block.date}${timed ? ` ${block.start}–${block.end}` : ' (all day)'}${reason ? ` · ${reason}` : ''}`,
        });
      });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

export async function removeBlock(id: string): Promise<Result> {
  return adminAction(
    'salon.availability',
    async (admin) => {
      if (!isUuid(id)) throw new ActionError('Not found.');
      const [row] = await db.delete(s.blocks).where(eq(s.blocks.id, id)).returning({ date: s.blocks.date });
      if (!row) throw new ActionError('Not found.');
      await audit(db, admin, { section: 'Salon', action: 'Reopened time', target: row.date });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}
