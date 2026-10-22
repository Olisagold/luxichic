'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, Maximize2Icon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/cn';
import { SiteImage } from '@/components/ui/SiteImage';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [viewer, setViewer] = useState(false);

  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="flex flex-col-reverse gap-4 self-start md:flex-row">
      {images.length > 1 && (
        <ul
          className="no-scrollbar flex gap-3 relative overflow-x-auto md:w-20 md:flex-col"
          aria-label="Product images"
        >
          {images.map((src, i) => (
            <li key={src + i}>
              <button
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'block h-24 w-20 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-ivory transition-[box-shadow,opacity] duration-150',
                  i === index ? 'ring-ink' : 'ring-transparent opacity-70 hover:opacity-100',
                )}
              >
                <SiteImage sizes="80px" src={src} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className="relative flex-1 cursor-zoom-in overflow-hidden md:self-start rounded-[28px] bg-champagne/40"
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
        onClick={() => setViewer(true)}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={images[index]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SiteImage
              src={images[index]}
              alt={`${name}, image ${index + 1} of ${images.length}`}
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority={index === 0}
              className="aspect-[4/5] w-full object-cover"
              style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          </motion.div>
        </AnimatePresence>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setViewer(true);
          }}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft"
          aria-label="Open full-screen viewer"
        >
          <Maximize2Icon className="h-4 w-4" />
        </button>
      </div>

      <Modal open={viewer} onClose={() => setViewer(false)} title={`${name} images`} dark className="max-w-5xl">
        <div className="relative flex items-center justify-center bg-ink p-4">
          <SiteImage
            sizes="(min-width: 1024px) 1024px, 100vw"
            src={images[index]}
            alt={`${name}, image ${index + 1}`}
            className="max-h-[75vh] w-auto rounded-xl object-contain"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink"
                aria-label="Previous image"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => go(1)}
                className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink"
                aria-label="Next image"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        <p className="px-6 pb-5 text-center text-xs text-white/60">
          {index + 1} / {images.length}
        </p>
      </Modal>
    </div>
  );
}
