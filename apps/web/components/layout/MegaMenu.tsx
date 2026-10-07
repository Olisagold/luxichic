'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRightIcon } from 'lucide-react';
import type { MegaMenu as MegaMenuData } from '@/data/navigation';

interface MegaMenuProps {
  menu: MegaMenuData;
  onNavigate: () => void;
}

export function MegaMenu({ menu, onNavigate }: MegaMenuProps) {
  return (
    <motion.div
      id={`mega-${menu.id}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-x-0 top-full border-t border-white/10 bg-white text-charcoal shadow-lift"
    >
      <div className="mx-auto grid max-w-site grid-cols-[1fr_300px] gap-10 px-8 py-10">
        <div className="grid grid-cols-4 gap-8">
          {menu.columns.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pink-deep">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link
                      href={l.to}
                      onClick={onNavigate}
                      className="text-sm text-charcoal transition-colors duration-150 hover:text-pink-deep"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link
          href={menu.feature.to}
          onClick={onNavigate}
          className="group relative block overflow-hidden rounded-[24px]"
        >
          <img
            src={menu.feature.image}
            alt=""
            className="h-64 w-full object-cover transition-transform duration-300 ease-lux group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 bg-ink/55 p-5 text-white">
            <p className="font-display text-2xl">{menu.feature.title}</p>
            <p className="mt-1 text-xs text-white/80">{menu.feature.text}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-pink">
              {menu.feature.cta} <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
