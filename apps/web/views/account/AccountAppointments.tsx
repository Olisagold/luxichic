'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrdersContext';
import { AppointmentList } from '@/components/account/AppointmentList';
import { Button } from '@/components/ui/Button';

export function AccountAppointments() {
  const { user } = useAuth();
  const { appointmentsForAccount } = useOrders();
  if (!user) return null;
  const list = [...appointmentsForAccount(user.email)].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl text-ink">Appointments</h1>
        <Button to="/salon/book" size="sm">Book new</Button>
      </div>
      <p className="mt-3 text-sm text-subtle">Salon services are paid for after your service. Message your specialist anytime on WhatsApp.</p>
      <div className="mt-6"><AppointmentList appointments={list} /></div>
    </div>);

}