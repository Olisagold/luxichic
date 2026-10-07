import React from 'react';
import Link from 'next/link';
import { MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { FooterSocials } from '@/components/layout/FooterSocials';
import { businessConfig } from '@/data/config';

const columns = [
  {
    title: 'LUXICHIC Hairs',
    links: [
      { label: 'All Hair Products', to: '/hairs/shop/all' },
      { label: 'Wigs', to: '/hairs/shop/wigs' },
      { label: 'Frontals & Closures', to: '/hairs/shop/frontals' },
      { label: 'Hair Bundles', to: '/hairs/shop/bundles' },
      { label: 'New Arrivals', to: '/hairs/shop/new-arrivals' },
    ],
  },
  {
    title: 'Hair Tools & Essentials',
    links: [
      { label: 'All Products', to: '/tools/shop/all' },
      { label: 'Styling Tools', to: '/tools/shop/styling-tools' },
      { label: 'Wig-Making Tools', to: '/tools/shop/wig-making' },
      { label: 'Haircare', to: '/tools/shop/haircare' },
      { label: 'Braiding Extensions', to: '/tools/shop/braiding' },
    ],
  },
  {
    title: 'Beauty Salon & Spa',
    links: [
      { label: 'All Services', to: '/salon/services' },
      { label: 'Nails', to: '/salon/services/nail-services' },
      { label: 'Lashes', to: '/salon/services/eyelash-extensions' },
      { label: 'Braiding', to: '/salon/services/braiding' },
      { label: 'Book an Appointment', to: '/salon/book' },
    ],
  },
  {
    title: 'Customer Support',
    links: [
      { label: 'Track an Order', to: '/track-order' },
      { label: 'My Account', to: '/account' },
      { label: 'FAQs', to: '/faq' },
      { label: 'About Us', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
    ],
  },
];

const policies = [
  { label: 'Privacy Policy', to: '/policies/privacy' },
  { label: 'Terms and Conditions', to: '/policies/terms' },
  { label: 'Shipping Policy', to: '/policies/shipping' },
  { label: 'Returns and Refunds', to: '/policies/returns' },
];

export function Footer() {
  const { contact } = businessConfig;
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-site px-5 pb-10 pt-20 lg:px-8">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.1fr_2fr]">
          <div>
            <Logo variant="main" className="-ml-1 h-16" />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/70">
              LUXICHIC brings together premium hair, professional beauty services and quality haircare essentials —
              everything you need to look and feel your best, in one place.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/80">
              <li className="flex gap-3">
                <MapPinIcon className="h-4 w-4 shrink-0 text-pink" aria-hidden />
                {contact.address}
              </li>
              <li className="flex gap-3">
                <PhoneIcon className="h-4 w-4 shrink-0 text-pink" aria-hidden />
                {contact.phone}
              </li>
              <li className="flex gap-3">
                <MailIcon className="h-4 w-4 shrink-0 text-pink" aria-hidden />
                {contact.email}
              </li>
            </ul>
            <FooterSocials />
          </div>
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {columns.map((c) => (
              <div key={c.title}>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pink">{c.title}</p>
                <ul className="mt-5 space-y-3">
                  {c.links.map((l) => (
                    <li key={l.to}>
                      <Link
                        href={l.to}
                        className="text-sm text-white/75 transition-colors duration-150 hover:text-white"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} LUXICHIC. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {policies.map((p) => (
              <li key={p.to}>
                <Link href={p.to} className="hover:text-white">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
