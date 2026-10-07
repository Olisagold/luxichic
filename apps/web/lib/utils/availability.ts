import { addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import type { AvailabilityBlock } from '@/types/admin';
import { businessConfig } from '@/data/config';
import { toISODate } from '@/lib/utils/dates';

export type DateStatus = 'unavailable' | 'closed' | 'full' | 'available';

function hash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const toMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** True when an admin block covers this date/time for the given service (and optional specialist). */
export function isBlocked(
  blocks: AvailabilityBlock[],
  dateKey: string,
  time: string | null,
  serviceSlug?: string | null,
  specialistId?: string | null,
): AvailabilityBlock | undefined {
  return blocks.find((b) => {
    if (b.date !== dateKey) return false;
    if (b.serviceSlug && serviceSlug && b.serviceSlug !== serviceSlug) return false;
    if (b.serviceSlug && !serviceSlug) return false;
    if (b.specialistId && specialistId && b.specialistId !== specialistId) return false;
    // A specialist-only block does not close the slot for "no preference" bookings.
    if (b.specialistId && !specialistId) return false;
    if (b.start === null) return true;
    if (time === null) return false;
    const t = toMins(time);
    const end = b.end ? toMins(b.end) : toMins(b.start) + 60;
    return t >= toMins(b.start) && t < end;
  });
}

/** PROTOTYPE availability: business rules + admin blocks + a simulated booking load. */
export function getDateStatus(date: Date, serviceSlug?: string | null): DateStatus {
  const today = startOfDay(new Date());
  if (isBefore(date, today) || isAfter(date, addDays(today, businessConfig.salon.bookingWindowDays)))
    return 'unavailable';
  if (businessConfig.salon.closedWeekdays.includes(date.getDay())) return 'closed';
  const key = toISODate(date);
  if (isBlocked(businessConfig.salon.blocks, key, null, serviceSlug ?? null, null)) return 'full';
  if (hash(key) % 9 === 0) return 'full';
  return 'available';
}

export interface Slot {
  time: string;
  available: boolean;
  blocked?: boolean;
}

export function slotsFor(dateKey: string, serviceSlug: string, specialistId?: string | null): Slot[] {
  const now = new Date();
  const isToday = dateKey === toISODate(now);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return businessConfig.salon.slots.map((time) => {
    const past = isToday && toMins(time) <= nowMins + 60;
    const blocked = !!isBlocked(businessConfig.salon.blocks, dateKey, time, serviceSlug, specialistId ?? null);
    const taken = hash(`${dateKey}-${serviceSlug}-${time}`) % 4 === 0;
    return { time, available: !past && !taken && !blocked, blocked };
  });
}
