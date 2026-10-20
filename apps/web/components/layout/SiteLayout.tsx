'use client';

import React, { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { WhatsAppIcon } from '@/components/ui/BrandIcons';
import { Toaster } from 'sonner';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { MainHeader } from '@/components/layout/MainHeader';
import { DivisionHeader } from '@/components/layout/DivisionHeader';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { SearchOverlay } from '@/components/layout/SearchOverlay';
import { QuickViewModal } from '@/components/product/QuickViewModal';
import { useStorefront } from '@/components/storefront/StorefrontProvider';
import { whatsappLink } from '@/lib/utils/whatsapp';

/** Lightweight placeholder shown while a route's code loads. */
function PageFallback() {
  return (
    <div className="mx-auto max-w-site px-5 py-16 lg:px-8" aria-busy="true" aria-label="Loading page">
      <div className="h-10 w-2/5 animate-pulse rounded-full bg-line/70" />
      <div className="mt-4 h-4 w-3/5 animate-pulse rounded-full bg-line/50" />
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-line/40" />
        ))}
      </div>
    </div>
  );
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { whatsapp } = useStorefront().business;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-ivory">
      <a
        href="#main"
        className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <MainHeader />
      <DivisionHeader />
      <motion.main
        id="main"
        key={pathname}
        className="flex-1"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      >
        <Suspense fallback={<PageFallback />}>{children}</Suspense>
      </motion.main>
      <Footer />

      <a
        href={whatsappLink(whatsapp.general, 'Hello LUXICHIC, I would like some help please.')}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lift transition-[background-color,transform] duration-200 ease-lux hover:bg-whatsapp-hover active:scale-95"
        aria-label="Chat with LUXICHIC on WhatsApp"
      >
        <WhatsAppIcon className="h-7 w-7" />
      </a>

      <CartDrawer />
      <SearchOverlay />
      <QuickViewModal />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: { borderRadius: '16px', fontFamily: 'var(--font-sans), sans-serif', border: '1px solid #E9E3DE' },
        }}
      />
    </div>
  );
}
