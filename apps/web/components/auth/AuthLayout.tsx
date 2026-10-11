import React from 'react';
import { images } from '@/data/images';
import { SiteImage } from '@/components/ui/SiteImage';

interface AuthLayoutProps {
  title: React.ReactNode;
  text?: React.ReactNode;
  image?: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, text, image = images.heroModel, children }: AuthLayoutProps) {
  return (
    <div className="mx-auto grid grid-cols-1 max-w-site gap-10 px-5 py-12 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-16">
      <div className="hidden overflow-hidden rounded-t-[999px] rounded-b-[32px] bg-champagne lg:block">
        <SiteImage
          sizes="(min-width: 1024px) 40vw, 100vw"
          src={image}
          alt=""
          className="aspect-[4/5] w-full object-cover"
        />
      </div>
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-display text-4xl leading-tight text-ink md:text-5xl">{title}</h1>
        {text && <div className="mt-3 text-[15px] leading-relaxed text-subtle">{text}</div>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
