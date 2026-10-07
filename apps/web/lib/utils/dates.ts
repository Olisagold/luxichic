import { format, parseISO } from 'date-fns';

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy');
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy, h:mm a');
}

export function formatLongDate(isoDate: string): string {
  return format(parseISO(isoDate), 'EEEE, d MMMM yyyy');
}

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** "14:00" → "2:00 PM" */
export function formatSlot(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
