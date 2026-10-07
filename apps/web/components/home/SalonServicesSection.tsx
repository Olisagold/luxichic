'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { ServiceCard } from '@/components/salon/ServiceCard';
import { salonServices } from '@/data/services';

const homeSlugs = ['manicure', 'pedicure', 'facials', 'eyelash-extensions', 'nail-services', 'braiding', 'hair-treatment', 'barbing'];

export function SalonServicesSection() {
  const reduce = useReducedMotion();
  const services = homeSlugs.map((s) => salonServices.find((x) => x.slug === s)).filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="mb-14 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl leading-[1.05] text-ink md:text-6xl">
              The Salon <span className="italic text-pink-deep">&amp; Spa</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-subtle">
              Nails, lashes, skin, braids and grooming by specialists who take their time. Book online in a minute — and only pay after your service.
            </p>
          </div>
          <Button to="/salon/book" size="lg" variant="pink">
            <CalendarIcon className="h-4 w-4" aria-hidden /> Book an Appointment
          </Button>
        </Reveal>
        <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) =>
          <motion.div
            key={s.slug}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, delay: i % 4 * 0.05, ease: [0.23, 1, 0.32, 1] }}>
            
              <ServiceCard service={s} showWhatsApp={false} />
            </motion.div>
          )}
        </div>
      </div>
    </section>);

}