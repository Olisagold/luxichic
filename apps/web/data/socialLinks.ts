import type { SocialDivision, SocialLink, SocialPlatform } from '@/types/admin';

export const socialPlatforms: Record<
  SocialPlatform,
  { label: string; urlLabel: string; placeholder: string; pattern?: RegExp }
> = {
  instagram: {
    label: 'Instagram',
    urlLabel: 'Profile link',
    placeholder: 'https://instagram.com/…',
    pattern: /^https:\/\/(www\.)?instagram\.com\//,
  },
  tiktok: {
    label: 'TikTok',
    urlLabel: 'Profile link',
    placeholder: 'https://www.tiktok.com/@…',
    pattern: /^https:\/\/(www\.)?tiktok\.com\//,
  },
  whatsapp: {
    label: 'WhatsApp',
    urlLabel: 'Number (international format)',
    placeholder: '2348012345678',
    pattern: /^\d{10,15}$/,
  },
  facebook: {
    label: 'Facebook',
    urlLabel: 'Page link',
    placeholder: 'https://facebook.com/…',
    pattern: /^https:\/\/(www\.|m\.)?(facebook|fb)\.com\//,
  },
  x: {
    label: 'X (Twitter)',
    urlLabel: 'Profile link',
    placeholder: 'https://x.com/…',
    pattern: /^https:\/\/(www\.)?(x|twitter)\.com\//,
  },
  youtube: {
    label: 'YouTube',
    urlLabel: 'Channel link',
    placeholder: 'https://youtube.com/@…',
    pattern: /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//,
  },
  snapchat: {
    label: 'Snapchat',
    urlLabel: 'Profile link',
    placeholder: 'https://snapchat.com/add/…',
    pattern: /^https:\/\/(www\.)?snapchat\.com\//,
  },
  website: { label: 'Website', urlLabel: 'Link', placeholder: 'https://…', pattern: /^https?:\/\// },
};

export const socialDivisions: { key: SocialDivision; label: string }[] = [
  { key: 'main', label: 'LUXICHIC (main)' },
  { key: 'hairs', label: 'LUXICHIC Hairs' },
  { key: 'salon', label: 'Beauty Salon & Spa' },
  { key: 'tools', label: 'Hair Tools & Essentials' },
];

/** Placeholder accounts until LUXICHIC supplies the real ones. */
export const defaultSocialLinks: SocialLink[] = [
  {
    id: 'soc_hairs_ig',
    division: 'hairs',
    platform: 'instagram',
    handle: '@luxichic.hairs',
    url: 'https://instagram.com/luxichic.hairs',
    enabled: true,
  },
  {
    id: 'soc_hairs_tt',
    division: 'hairs',
    platform: 'tiktok',
    handle: '@luxichic.hairs',
    url: 'https://www.tiktok.com/@luxichic.hairs',
    enabled: true,
  },
  {
    id: 'soc_hairs_wa',
    division: 'hairs',
    platform: 'whatsapp',
    handle: 'Hairs orders',
    url: '2340000000002',
    enabled: true,
  },
  {
    id: 'soc_salon_ig',
    division: 'salon',
    platform: 'instagram',
    handle: '@luxichic.salonandspa',
    url: 'https://instagram.com/luxichic.salonandspa',
    enabled: true,
  },
  {
    id: 'soc_salon_tt',
    division: 'salon',
    platform: 'tiktok',
    handle: '@luxichic.salonandspa',
    url: 'https://www.tiktok.com/@luxichic.salonandspa',
    enabled: true,
  },
  {
    id: 'soc_salon_wa',
    division: 'salon',
    platform: 'whatsapp',
    handle: 'Salon bookings',
    url: '2340000000003',
    enabled: true,
  },
  {
    id: 'soc_tools_ig',
    division: 'tools',
    platform: 'instagram',
    handle: '@luxichic.wigtools',
    url: 'https://instagram.com/luxichic.wigtools',
    enabled: true,
  },
  {
    id: 'soc_tools_tt',
    division: 'tools',
    platform: 'tiktok',
    handle: '@luxichic.wigtools',
    url: 'https://www.tiktok.com/@luxichic.wigtools',
    enabled: true,
  },
  {
    id: 'soc_tools_wa',
    division: 'tools',
    platform: 'whatsapp',
    handle: 'Tools orders',
    url: '2340000000004',
    enabled: true,
  },
];
