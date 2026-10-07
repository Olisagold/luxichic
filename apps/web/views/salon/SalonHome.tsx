'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarCheckIcon, HandCoinsIcon, MessageCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ServiceCard } from '@/components/salon/ServiceCard';
import { Reveal } from '@/components/ui/Reveal';
import { salonServices } from '@/data/services';
import { images } from '@/data/images';

const how = [
  {
    icon: CalendarCheckIcon,
    title: 'Request your slot',
    text: 'Choose a service, date and time online — as a guest or with your account.',
  },
  {
    icon: MessageCircleIcon,
    title: 'We confirm with you',
    text: 'Our team contacts you to confirm. Chat with your specialist on WhatsApp anytime.',
  },
  {
    icon: HandCoinsIcon,
    title: 'Pay after your service',
    text: 'No deposits and no online payment. You only pay once your service is complete.',
  },
];

export function SalonHome() {
  const reduce = useReducedMotion();
  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <img src={images.salonInterior} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-ink/40" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-24 md:py-32 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:px-8">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            <h1 className="font-display text-5xl uppercase leading-[0.95] md:text-7xl">
              Your beauty deserves the <span className="italic normal-case text-pink">LUXICHIC experience.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/85">
              Relax, refresh and rediscover your beauty with our professional salon and spa services.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button to="/salon/book" variant="pink" size="lg">
                Book an Appointment
              </Button>
              <Button to="/salon/services" variant="outlineLight" size="lg">
                Explore Our Services
              </Button>
            </div>
          </motion.div>
          <img
            src={images.nails}
            alt="Pink almond nails with chrome detailing by LUXICHIC"
            className="hidden aspect-[4/5] w-full max-w-sm justify-self-end rounded-t-[999px] rounded-b-[28px] object-cover lg:block"
          />
        </div>
      </section>

      <section className="bg-ivory py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            title={
              <>
                Our <span className="italic text-pink-deep">services</span>
              </>
            }
            text="Prices and durations will be confirmed by our team. Tap any service to learn more or book."
            action={{ label: 'All services', to: '/salon/services' }}
          />
          <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {salonServices.map((s) => (
              <ServiceCard key={s.slug} service={s} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal>
            <h2 className="max-w-2xl font-display text-4xl leading-tight text-ink md:text-5xl">How booking works</h2>
          </Reveal>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {how.map((h, i) => (
              <li key={h.title} className="border-t border-ink pt-6">
                <div className="flex items-center justify-between">
                  <h.icon className="h-6 w-6 text-gold" strokeWidth={1.5} aria-hidden />
                  <span className="font-display text-2xl text-muted">{i + 1}</span>
                </div>
                <h3 className="mt-5 font-display text-2xl text-ink">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-subtle">{h.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14 flex justify-center">
            <Button to="/salon/book" size="lg">
              Book an Appointment
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
