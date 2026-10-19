import 'server-only';
import { asc, eq, gte } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { bookingScope, getAdmin, hasPermission } from '@/lib/auth/session';
import { loadAppointments } from '@/lib/salon/queries';
import { lagosNow } from '@/lib/salon/schedule';
import { loadSalon } from '@/lib/storefront/source';
import type { AdminSalon } from '@/components/admin/AdminSalonProvider';
import type { AvailabilityBlock, Permission } from '@/types/admin';

const EMPTY: AdminSalon = { appointments: [], services: [], specialists: [], blocks: [], whatsapp: '', scope: null };
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

/** Closed days and hours from today on, in the shape the admin screens use. */
async function upcomingBlocks(): Promise<AvailabilityBlock[]> {
  const rows = await db
    .select({ b: s.blocks, serviceSlug: s.services.slug, by: s.admins.fullName })
    .from(s.blocks)
    .leftJoin(s.services, eq(s.services.id, s.blocks.serviceId))
    .leftJoin(s.admins, eq(s.admins.id, s.blocks.createdByAdminId))
    .where(gte(s.blocks.date, lagosNow().today))
    .orderBy(asc(s.blocks.date), asc(s.blocks.startTime));
  return rows.map(({ b, serviceSlug, by }) => ({
    id: b.id,
    date: b.date,
    start: hhmm(b.startTime),
    end: hhmm(b.endTime),
    serviceSlug: serviceSlug ?? null,
    specialistId: b.specialistId,
    reason: b.reason,
    createdBy: by ?? 'LUXICHIC',
    createdAt: b.createdAt.toISOString(),
  }));
}

/**
 * Data for an admin salon page, or nothing when the admin lacks `permission` (the page explains). A specialist's
 * own login gets only their own bookings.
 */
export async function salonFor(permission: Permission): Promise<AdminSalon> {
  const admin = await getAdmin();
  if (!admin || !hasPermission(admin, permission)) return EMPTY;
  const { services, specialists } = await loadSalon();
  const [business] = await db
    .select({ value: s.settings.value })
    .from(s.settings)
    .where(eq(s.settings.key, 'business'));
  const scope = bookingScope(admin);
  return {
    appointments: await loadAppointments(scope ? eq(s.appointments.specialistId, scope) : undefined),
    scope,
    services,
    specialists,
    blocks: await upcomingBlocks(),
    whatsapp: (business?.value as { whatsapp?: string } | undefined)?.whatsapp ?? '',
  };
}
