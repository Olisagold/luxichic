'use client';

import React from 'react';
import { socialDivisions, socialPlatforms } from '@/data/socialLinks';
import { useStorefront } from '@/components/storefront/StorefrontProvider';
import { SocialIcon, socialHref } from '@/components/ui/SocialIcon';

/** Social icons grouped by division. Fully managed from Admin → Settings → Social media. */
export function FooterSocials() {
  const links = useStorefront().business.socialLinks;
  const groups = socialDivisions
    .map((d) => ({ ...d, links: links.filter((l) => l.enabled && l.division === d.key && l.url.trim()) }))
    .filter((g) => g.links.length > 0);

  if (!groups.length) return null;

  return (
    <div className="mt-8 space-y-5">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="text-xs font-semibold text-white/60">{g.key === 'main' ? 'Follow LUXICHIC' : g.label}</p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {g.links.map((l) => {
              const label = `${g.label} on ${socialPlatforms[l.platform].label}${l.handle ? ` (${l.handle})` : ''}`;
              return (
                <li key={l.id}>
                  <a
                    href={socialHref(l)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition-[background-color,border-color,color,box-shadow] duration-200 ease-lux hover:border-pink hover:bg-pink hover:text-ink hover:shadow-[0_0_24px_rgba(240,40,140,0.55)]"
                  >
                    <SocialIcon platform={l.platform} className="h-[18px] w-[18px]" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
