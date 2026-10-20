import { describe, expect, it } from 'vitest';
import {
  computeAvailability,
  freeSpecialists,
  toMinutes,
  type ScheduleInput,
  type ScheduleSpecialist,
} from '@/lib/salon/availability';

const h = (start: string, end: string) => ({ start: toMinutes(start), end: toMinutes(end) });
// 2026-10-19 is a Monday (weekday 1); Sunday is 0.
const ada: ScheduleSpecialist = {
  id: 'ada',
  name: 'Ada',
  hours: { 1: h('09:00', '18:00'), 2: h('09:00', '18:00'), 0: h('12:00', '16:00') },
};
const bola: ScheduleSpecialist = { id: 'bola', name: 'Bola', hours: { 1: h('10:00', '14:00') } };

const input = (over: Partial<ScheduleInput> = {}): ScheduleInput => ({
  today: '2026-10-19',
  now: toMinutes('10:00'),
  windowDays: 60,
  durationMinutes: 60,
  specialists: [ada, bola],
  blocks: [],
  booked: [],
  ...over,
});
const free = (i: ScheduleInput, date: string, time: string) =>
  freeSpecialists(i, date, toMinutes(time)).map((s) => s.id);

describe('who is free', () => {
  it('only within each specialist’s working hours, with time to finish the service', () => {
    expect(free(input(), '2026-10-20', '09:00')).toEqual(['ada']);
    expect(free(input(), '2026-10-20', '17:00')).toEqual(['ada']);
    expect(free(input({ durationMinutes: 90 }), '2026-10-20', '17:00')).toEqual([]);
    expect(free(input(), '2026-10-26', '13:00')).toEqual(['ada', 'bola']);
  });

  it('needs an hour’s notice today, and nothing in the past', () => {
    expect(free(input(), '2026-10-19', '10:00')).toEqual([]);
    expect(free(input(), '2026-10-19', '10:30')).toEqual([]);
    expect(free(input(), '2026-10-19', '11:00')).toEqual(['ada', 'bola']);
    expect(free(input(), '2026-10-18', '13:00')).toEqual([]);
  });

  it('only inside the booking window', () => {
    expect(free(input(), '2026-12-15', '12:00')).toEqual(['ada']); // Tuesday, day 57
    expect(free(input({ windowDays: 7 }), '2026-12-15', '12:00')).toEqual([]);
  });

  it('works on Sundays for specialists who do', () => {
    expect(free(input(), '2026-10-25', '12:00')).toEqual(['ada']);
    expect(free(input(), '2026-10-25', '16:00')).toEqual([]);
  });

  it('respects closed days and hours for the salon or one specialist', () => {
    const wholeDay = { date: '2026-10-26', start: null, end: null, specialistId: null };
    expect(free(input({ blocks: [wholeDay] }), '2026-10-26', '11:00')).toEqual([]);
    const adaHour = { date: '2026-10-26', start: toMinutes('11:00'), end: toMinutes('12:00'), specialistId: 'ada' };
    expect(free(input({ blocks: [adaHour] }), '2026-10-26', '11:00')).toEqual(['bola']);
    expect(free(input({ blocks: [adaHour] }), '2026-10-26', '12:00')).toEqual(['ada', 'bola']);
  });

  it('never double-books: any overlap with an existing booking makes the specialist busy', () => {
    const booked = [{ specialistId: 'ada', date: '2026-10-26', start: toMinutes('11:30'), end: toMinutes('12:30') }];
    expect(free(input({ booked }), '2026-10-26', '11:00')).toEqual(['bola']);
    expect(free(input({ booked }), '2026-10-26', '12:00')).toEqual(['bola']);
    expect(free(input({ booked }), '2026-10-26', '13:00')).toEqual(['ada', 'bola']);
  });
});

describe('the calendar', () => {
  it('marks days nobody works as closed, and fully booked days as full', () => {
    const a = computeAvailability(input());
    expect(a.days['2026-10-21']).toBe('closed'); // Wednesday: nobody works
    expect(a.days['2026-10-20']).toBe('available');
    const busy = [9, 10, 11, 12, 13, 14, 15, 16, 17].map((hr) => ({
      specialistId: 'ada',
      date: '2026-10-20',
      start: hr * 60,
      end: hr * 60 + 60,
    }));
    expect(computeAvailability(input({ booked: busy })).days['2026-10-20']).toBe('full');
  });

  it('offers hourly times from the earliest start to the last that fits', () => {
    const times = computeAvailability(input()).slots['2026-10-20'].map((s) => s.time);
    expect(times[0]).toBe('09:00');
    expect(times.at(-1)).toBe('17:00');
  });

  it('can show one specialist’s times only', () => {
    const a = computeAvailability(input(), 'bola');
    expect(a.days['2026-10-20']).toBe('closed'); // Bola doesn't work Tuesdays
    expect(a.slots['2026-10-26'].map((s) => s.time)).toEqual(['10:00', '11:00', '12:00', '13:00']);
  });

  it('covers today through the end of the window', () => {
    const days = Object.keys(computeAvailability(input()).days).sort();
    expect(days[0]).toBe('2026-10-19');
    expect(days.at(-1)).toBe('2026-12-18');
  });
});
