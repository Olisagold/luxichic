'use client';

import React from 'react';
import { AppointmentList } from '@/components/account/AppointmentList';
import { Button } from '@/components/ui/Button';
import type { Appointment } from '@/types/salon';

export function AccountAppointments({ appointments: list }: { appointments: Appointment[] }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl text-ink">Appointments</h1>
        <Button to="/salon/book" size="sm">
          Book new
        </Button>
      </div>
      <p className="mt-3 text-sm text-subtle">
        Salon services are paid for after your service. Open an appointment to reschedule or cancel it, or message us on
        WhatsApp.
      </p>
      <div className="mt-6">
        <AppointmentList appointments={list} />
      </div>
    </div>
  );
}
