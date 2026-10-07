'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CheckIcon, ClockIcon, UserIcon } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { ServiceCard, servicePriceLabel } from '@/components/salon/ServiceCard';
import { AppointmentBookingForm } from '@/components/salon/AppointmentBookingForm';
import { findService, salonServices } from '@/data/services';
import { serviceEnquiryMessage } from '@/lib/utils/whatsapp';
import { NotFound } from '@/views/info/NotFound';

export function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const service = findService(slug);
  if (!service) return <NotFound />;

  const related = salonServices.filter((s) => s.slug !== service.slug && s.category === service.category).
  concat(salonServices.filter((s) => s.slug !== service.slug && s.category !== service.category)).
  slice(0, 4);

  return (
    <div>
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-8">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Beauty Salon & Spa', to: '/salon' }, { label: 'Services', to: '/salon/services' }, { label: service.name }]} />
      </div>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        <img src={service.image} alt={service.name} className="aspect-[4/5] w-full rounded-t-[999px] rounded-b-[32px] object-cover" />
        <div className="lg:pt-10">
          <p className="text-xs font-semibold text-pink-deep">{service.category}</p>
          <h1 className="mt-2 font-display text-5xl leading-none text-ink md:text-6xl">{service.name}</h1>
          <p className="mt-6 text-base leading-relaxed text-charcoal">{service.description}</p>
          <dl className="mt-8 grid gap-4 border-y border-line py-6 sm:grid-cols-2">
            <div><dt className="text-xs text-subtle">Price</dt><dd className="mt-1 font-semibold text-ink">{servicePriceLabel(service)}</dd></div>
            {service.duration && <div><dt className="flex items-center gap-1 text-xs text-subtle"><ClockIcon className="h-3.5 w-3.5" aria-hidden /> Estimated duration</dt><dd className="mt-1 font-semibold text-ink">{service.duration}</dd></div>}
          </dl>
          <h2 className="mt-8 text-sm font-semibold text-ink">What’s included</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {service.includes.map((i) =>
            <li key={i} className="flex gap-2 text-sm text-charcoal"><CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />{i}</li>
            )}
          </ul>
          <h2 className="mt-8 text-sm font-semibold text-ink">Specialists</h2>
          <ul className="mt-3 space-y-2">
            {service.personnel.map((p) =>
            <li key={p.id} className="flex items-center gap-3 text-sm text-charcoal">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blush text-pink-deep"><UserIcon className="h-4 w-4" aria-hidden /></span>
                {p.name}
              </li>
            )}
          </ul>
          <WhatsAppButton number={service.whatsapp} message={serviceEnquiryMessage(service.name)} label={`Ask about ${service.name}`} className="mt-8" />
        </div>
      </section>

      <section id="book" className="bg-white py-16 md:py-24" aria-labelledby="book-heading">
        <div className="mx-auto max-w-4xl px-5 lg:px-8">
          <h2 id="book-heading" className="font-display text-4xl text-ink md:text-5xl">Book {service.name}</h2>
          <div className="mt-10"><AppointmentBookingForm initialService={service.slug} lockService /></div>
        </div>
      </section>

      <section className="bg-ivory py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <h2 className="font-display text-4xl text-ink">You may also love</h2>
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((s) => <ServiceCard key={s.slug} service={s} />)}
          </div>
        </div>
      </section>
    </div>);

}