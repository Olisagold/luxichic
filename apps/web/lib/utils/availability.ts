import type { AvailabilityBlock } from '@/types/admin';

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
