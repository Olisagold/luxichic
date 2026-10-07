import React, { useState } from 'react';
import { addMonths, differenceInCalendarMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { getDateStatus } from '../../utils/availability';
import { toISODate } from '../../utils/dates';
import { cn } from '../../utils/cn';

interface AppointmentCalendarProps {
  value: string | null;
  onChange: (dateKey: string) => void;
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AppointmentCalendar({ value, onChange }: AppointmentCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const lead = getDay(days[0]);
  const isCurrentMonth = isSameMonth(month, new Date());

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setMonth((m) => subMonths(m, 1))} disabled={isCurrentMonth} className="flex h-9 w-9 items-center justify-center rounded-full border border-line disabled:opacity-30" aria-label="Previous month">
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <p className="font-display text-2xl text-ink" aria-live="polite">{format(month, 'MMMM yyyy')}</p>
        <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} disabled={differenceInCalendarMonths(month, new Date()) >= 2} className="flex h-9 w-9 items-center justify-center rounded-full border border-line disabled:opacity-30" aria-label="Next month">
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Choose a date">
        {weekdays.map((d) => <span key={d} className="pb-2 text-[11px] font-semibold text-subtle">{d}</span>)}
        {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
        {days.map((d) => {
          const key = toISODate(d);
          const status = getDateStatus(d);
          const selectable = status === 'available';
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              disabled={!selectable}
              onClick={() => onChange(key)}
              aria-pressed={selected}
              aria-label={`${format(d, 'EEEE d MMMM')}${status === 'closed' ? ', closed' : status === 'full' ? ', fully booked' : !selectable ? ', unavailable' : ''}`}
              className={cn(
                'relative mx-auto flex aspect-square w-full max-w-[44px] items-center justify-center rounded-full text-sm tabular-nums transition-colors duration-150',
                selected && 'bg-ink text-white',
                !selected && selectable && 'text-ink hover:bg-blush',
                status === 'full' && 'text-muted line-through',
                (status === 'closed' || status === 'unavailable') && 'text-line'
              )}>
              
              {format(d, 'd')}
              {selectable && !selected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pink" aria-hidden />}
            </button>);

        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 border-t border-line pt-3 text-[11px] text-subtle">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-pink" /> Available</span>
        <span className="line-through">Fully booked</span>
        <span className="text-muted">Closed on Sundays</span>
      </div>
    </div>);

}