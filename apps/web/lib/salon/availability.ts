/**
 * Salon availability: which days and start times a service can be booked, from the specialists who perform it,
 * their weekly hours, closed days/hours and existing bookings. Pure, so it's easy to test; lib/salon/schedule.ts
 * loads its input from the database. All dates and times are the salon's local time (Lagos).
 */

/** Minutes after midnight. */
export type Minutes = number;

export interface ScheduleSpecialist {
  id: string;
  name: string;
  /** Working hours by weekday (0 = Sunday); days off are missing. */
  hours: Partial<Record<number, { start: Minutes; end: Minutes }>>;
}

export interface ScheduleInput {
  /** Today's date in Lagos (YYYY-MM-DD) and the time now. */
  today: string;
  now: Minutes;
  /** How many days ahead can be booked. */
  windowDays: number;
  durationMinutes: number;
  /** Active specialists who perform the service. */
  specialists: ScheduleSpecialist[];
  /** Closed days/hours that apply to this service. `specialistId` null = the whole salon. */
  blocks: { date: string; start: Minutes | null; end: Minutes | null; specialistId: string | null }[];
  /** Time already booked by active appointments. */
  booked: { specialistId: string; date: string; start: Minutes; end: Minutes }[];
}

export type DayStatus = 'available' | 'full' | 'closed';

export interface Slot {
  time: string;
  available: boolean;
}

export interface Availability {
  /** Days that can be shown, today through the end of the booking window. Missing days can't be booked. */
  days: Record<string, DayStatus>;
  /** Start times for each day someone works. */
  slots: Record<string, Slot[]>;
}

/** Bookings must be made at least this long before they start. */
export const MIN_NOTICE_MINUTES = 60;
export const BOOKING_WINDOW_DAYS = 60;
const SLOT_STEP = 60;

export const toMinutes = (t: string): Minutes => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
export const toTime = (m: Minutes) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

const overlaps = (a0: Minutes, a1: Minutes, b0: Minutes, b1: Minutes) => a0 < b1 && b0 < a1;

/** Whether `date` is inside the booking window. */
export function inWindow(input: Pick<ScheduleInput, 'today' | 'windowDays'>, date: string): boolean {
  return date >= input.today && date <= addDays(input.today, input.windowDays);
}

/** Specialists free for the whole of [start, start + duration) on `date`, in the order given. */
export function freeSpecialists(input: ScheduleInput, date: string, start: Minutes): ScheduleSpecialist[] {
  if (!inWindow(input, date)) return [];
  if (date === input.today && start < input.now + MIN_NOTICE_MINUTES) return [];
  const end = start + input.durationMinutes;
  const day = weekday(date);
  return input.specialists.filter((sp) => {
    const hours = sp.hours[day];
    if (!hours || start < hours.start || end > hours.end) return false;
    const blocked = input.blocks.some(
      (b) =>
        b.date === date &&
        (b.specialistId === null || b.specialistId === sp.id) &&
        (b.start === null || overlaps(start, end, b.start, b.end ?? b.start + SLOT_STEP)),
    );
    if (blocked) return false;
    return !input.booked.some(
      (x) => x.specialistId === sp.id && x.date === date && overlaps(start, end, x.start, x.end),
    );
  });
}

/** Days and start times for the service, for any specialist or only `specialistId`. */
export function computeAvailability(input: ScheduleInput, specialistId?: string | null): Availability {
  const schedule = specialistId
    ? { ...input, specialists: input.specialists.filter((s) => s.id === specialistId) }
    : input;
  const days: Availability['days'] = {};
  const slots: Availability['slots'] = {};
  for (let i = 0; i <= input.windowDays; i++) {
    const date = addDays(input.today, i);
    const working = schedule.specialists.map((s) => s.hours[weekday(date)]).filter((h) => !!h);
    if (!working.length) {
      days[date] = 'closed';
      continue;
    }
    // Every hour from the earliest start to the latest one that still fits the service.
    const first = Math.ceil(Math.min(...working.map((h) => h.start)) / SLOT_STEP) * SLOT_STEP;
    const last = Math.max(...working.map((h) => h.end)) - input.durationMinutes;
    const list: Slot[] = [];
    for (let t = first; t <= last; t += SLOT_STEP) {
      list.push({ time: toTime(t), available: freeSpecialists(schedule, date, t).length > 0 });
    }
    slots[date] = list;
    days[date] = list.some((s) => s.available) ? 'available' : 'full';
  }
  return { days, slots };
}
