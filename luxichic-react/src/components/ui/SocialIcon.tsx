import React from 'react';
import { GlobeIcon, InstagramIcon } from 'lucide-react';
import type { SocialLink, SocialPlatform } from '../../types/admin';
import { FacebookIcon, SnapchatIcon, TikTokIcon, WhatsAppIcon, XBrandIcon, YouTubeIcon } from './BrandIcons';
import { whatsappLink } from '../../utils/whatsapp';

export function SocialIcon({ platform, className }: {platform: SocialPlatform;className?: string;}) {
  switch (platform) {
    case 'instagram':return <InstagramIcon className={className} aria-hidden />;
    case 'tiktok':return <TikTokIcon className={className} />;
    case 'whatsapp':return <WhatsAppIcon className={className} />;
    case 'facebook':return <FacebookIcon className={className} />;
    case 'x':return <XBrandIcon className={className} />;
    case 'youtube':return <YouTubeIcon className={className} />;
    case 'snapchat':return <SnapchatIcon className={className} />;
    default:return <GlobeIcon className={className} aria-hidden />;
  }
}

/** Resolves a social link to the URL a customer should open. */
export function socialHref(link: SocialLink): string {
  return link.platform === 'whatsapp' ? whatsappLink(link.url, 'Hello LUXICHIC!') : link.url;
}