import { NextResponse } from 'next/server';
import { and, eq, inArray, notExists, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { emailAppointment } from '@/lib/email/customer';
import { env } from '@/lib/env';
import { addDays } from '@/lib/salon/availability';
import { lagosNow } from '@/lib/salon/schedule';

const REMINDED = 'Reminder email sent';

/**
 * Daily (vercel.json): emails a reminder for each confirmed appointment tomorrow, Lagos time. Each is noted in
 * the appointment's history, so a repeated run doesn't send it twice. Vercel sends CRON_SECRET as a Bearer token.
 */
export async function GET(request: Request) {
  if (!env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tomorrow = addDays(lagosNow().today, 1);
  const due = await db
    .select({ id: s.appointments.id })
    .from(s.appointments)
    .where(
      and(
        eq(s.appointments.date, tomorrow),
        inArray(s.appointments.status, ['confirmed', 'rescheduled']),
        notExists(
          db
            .select({ one: sql`1` })
            .from(s.appointmentEvents)
            .where(
              and(eq(s.appointmentEvents.appointmentId, s.appointments.id), eq(s.appointmentEvents.label, REMINDED)),
            ),
        ),
      ),
    );
  for (const { id } of due) {
    await emailAppointment(id, 'reminder');
    await db.insert(s.appointmentEvents).values({ appointmentId: id, label: REMINDED });
  }
  return NextResponse.json({ ok: true, date: tomorrow, sent: due.length });
}
