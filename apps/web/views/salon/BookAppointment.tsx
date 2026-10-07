'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AppointmentBookingForm } from '@/components/salon/AppointmentBookingForm';
import { images } from '@/data/images';

export function BookAppointment() {
  const params = useSearchParams();
  const service = params.get('service') ?? undefined;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Beauty Salon & Spa', to: '/salon' },
          { label: 'Book an Appointment' },
        ]}
      />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="rounded-[28px] bg-white p-6 md:p-10">
          <h1 className="font-display text-5xl text-ink md:text-6xl">Book an appointment</h1>
          <p className="mt-3 text-[15px] text-subtle">
            Request your preferred time and our team will contact you to confirm.
          </p>
          <div className="mt-10">
            <AppointmentBookingForm key={service ?? 'none'} initialService={service} />
          </div>
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-28 overflow-hidden rounded-[28px] bg-ink text-white">
            <img src={images.braids} alt="" className="aspect-[4/5] w-full object-cover" />
            <div className="p-6">
              <p className="font-display text-2xl">Pay after your service</p>
              <p className="mt-2 text-sm text-white/70">
                We never take payment, deposits or booking fees online for salon services.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
