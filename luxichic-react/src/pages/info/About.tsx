import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { Reveal } from '../../components/ui/Reveal';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { brandValues, siteContent } from '../../data/content';
import { images } from '../../data/images';

const divisions = [
{ logo: 'hairs' as const, title: 'LUXICHIC Hairs', text: 'Premium wigs, human hair, frontals, closures and bundles — plus wig installation, revamping and maintenance.', to: '/hairs', image: images.bodyWaveWig },
{ logo: 'salon' as const, title: 'LUXICHIC Beauty Salon & Spa', text: 'Nails, lashes, facials, braiding, hair treatment and barbing by skilled specialists. Pay only after your service.', to: '/salon', image: images.nails },
{ logo: 'tools' as const, title: 'LUXICHIC Hair Tools & Essentials', text: 'Styling tools, wig-making essentials, salon equipment, haircare and affordable braiding extensions.', to: '/tools', image: images.hotComb }];


export function About() {
  const about = siteContent.about;
  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
        <Reveal>
          <h1 className="font-display text-5xl leading-[0.98] text-ink md:text-7xl">{about.title} <span className="italic text-pink-deep">{about.accent}</span></h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-charcoal">{about.intro}</p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-subtle">{about.description}</p>
          {(about.mission || about.vision) &&
          <dl className="mt-8 grid max-w-xl gap-6 border-t border-line pt-6 sm:grid-cols-2">
              {about.mission && <div><dt className="font-display text-2xl text-ink">Mission</dt><dd className="mt-1 text-sm text-subtle">{about.mission}</dd></div>}
              {about.vision && <div><dt className="font-display text-2xl text-ink">Vision</dt><dd className="mt-1 text-sm text-subtle">{about.vision}</dd></div>}
            </dl>
          }
        </Reveal>
        <img src={about.image} alt="LUXICHIC client with LUXICHIC Hairs bags" className="aspect-[4/5] w-full rounded-t-[999px] rounded-b-[32px] object-cover" />
      </section>

      <section className="bg-ink py-20 text-white md:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <h2 className="font-display text-4xl md:text-6xl">Our divisions</h2>
          <ul className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {divisions.map((d) =>
            <li key={d.title}>
                <Link to={d.to} className="group grid items-center gap-6 py-8 md:grid-cols-[160px_1fr_auto]">
                  <img src={d.image} alt="" className="aspect-square w-32 rounded-2xl object-cover md:w-40" loading="lazy" />
                  <div>
                    <Logo variant={d.logo} className="-ml-1 h-12" />
                    <h3 className="mt-3 font-display text-3xl">{d.title}</h3>
                    <p className="mt-2 max-w-xl text-sm text-white/70">{d.text}</p>
                  </div>
                  <ArrowRightIcon className="h-6 w-6 text-pink transition-transform duration-200 ease-lux group-hover:translate-x-1" aria-hidden />
                </Link>
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:py-28 lg:px-8">
        <h2 className="font-display text-4xl text-ink md:text-5xl">What we stand for</h2>
        <dl className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
          {brandValues.map((v) =>
          <div key={v.title} className="border-t border-ink pt-5">
              <dt className="font-display text-2xl text-ink">{v.title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-subtle">{v.text}</dd>
            </div>
          )}
        </dl>
        <div className="mt-14 flex flex-wrap gap-3">
          <Button to="/hairs">{about.cta}</Button>
          <Button to="/salon/book" variant="outline">Book an Appointment</Button>
        </div>
      </section>
    </>);

}