import React from 'react';
import Link from 'next/link';
import { ClockIcon } from 'lucide-react';
import type { SalonService } from '@/types/salon';
import { Button } from '@/components/ui/Button';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { formatNaira } from '@/lib/utils/currency';
import { serviceEnquiryMessage } from '@/lib/utils/whatsapp';
import { SiteImage } from '@/components/ui/SiteImage';

export function servicePriceLabel(s: SalonService): string {
  return s.startingPrice !== null ? `From ${formatNaira(s.startingPrice)}` : 'Price on request';
}

export function ServiceCard({ service, showWhatsApp = true }: { service: SalonService; showWhatsApp?: boolean }) {
  return (
    <article className="group flex h-full flex-col">
      <Link
        href={`/salon/services/${service.slug}`}
        className="block overflow-hidden rounded-t-[999px] rounded-b-[24px] bg-champagne"
        tabIndex={-1}
        aria-hidden
      >
        <SiteImage
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          src={service.image}
          alt=""
          className="aspect-[3/4] w-full object-cover transition-transform duration-300 ease-lux group-hover:scale-[1.04]"
        />
      </Link>
      <div className="flex flex-1 flex-col px-1 pt-5">
        <p className="text-xs font-semibold text-pink-deep">{service.category}</p>
        <h3 className="mt-1 font-display text-3xl leading-tight text-ink">
          <Link href={`/salon/services/${service.slug}`} className="hover:text-pink-deep">
            {service.name}
          </Link>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-subtle">{service.shortDescription}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal">
          <span className="font-semibold">{servicePriceLabel(service)}</span>
          {service.duration && (
            <span className="inline-flex items-center gap-1 text-subtle">
              <ClockIcon className="h-3.5 w-3.5" aria-hidden /> {service.duration}
            </span>
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          <Button to={`/salon/book?service=${service.slug}`} size="sm">
            Book Now
          </Button>
          {showWhatsApp && (
            <WhatsAppButton
              number={service.whatsapp}
              message={serviceEnquiryMessage(service.name)}
              label="WhatsApp"
              size="sm"
            />
          )}
        </div>
      </div>
    </article>
  );
}
