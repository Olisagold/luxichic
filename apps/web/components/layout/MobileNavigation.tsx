'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, HeartIcon, SearchIcon, ShoppingBagIcon, UserIcon, XIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Logo } from '@/components/ui/Logo';
import { megaMenus } from '@/data/navigation';
import { useUI } from '@/contexts/UIContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/cn';

interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { openSearch, openCart } = useUI();
  const { count } = useCart();
  const { user } = useAuth();

  const linkClass = 'block py-4 font-display text-3xl text-white';

  return (
    <Modal open={open} onClose={onClose} title="Menu" hideTitle side="left" dark>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <Logo variant="main" className="h-10" />
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Close menu">
          <XIcon className="h-5 w-5" />
        </button>
      </div>
      <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 pb-8">
        <ul className="divide-y divide-white/10">
          <li>
            <Link href="/" onClick={onClose} className={linkClass}>Home</Link>
          </li>
          {megaMenus.map((m) => {
            const isOpen = expanded === m.id;
            return (
              <li key={m.id}>
                <button
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between py-4 text-left font-display text-3xl text-white">
                  
                  {m.label}
                  <ChevronDownIcon className={cn('h-5 w-5 transition-transform duration-200 ease-lux', isOpen && 'rotate-180')} aria-hidden />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen &&
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden">
                    
                      <div className="space-y-5 pb-5">
                        <Link href={m.to} onClick={onClose} className="text-xs font-bold uppercase tracking-[0.18em] text-pink">
                          Visit {m.label} →
                        </Link>
                        {m.columns.map((col) =>
                      <div key={col.title}>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">{col.title}</p>
                            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                              {col.links.map((l) =>
                          <li key={l.to + l.label}>
                                  <Link href={l.to} onClick={onClose} className="text-sm text-white/85">{l.label}</Link>
                                </li>
                          )}
                            </ul>
                          </div>
                      )}
                      </div>
                    </motion.div>
                  }
                </AnimatePresence>
              </li>);

          })}
          <li><Link href="/about" onClick={onClose} className={linkClass}>About Us</Link></li>
          <li><Link href="/contact" onClick={onClose} className={linkClass}>Contact Us</Link></li>
          <li><Link href="/track-order" onClick={onClose} className="block py-4 text-sm text-white/80">Track an order</Link></li>
        </ul>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={() => {onClose();openSearch();}} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white">
            <SearchIcon className="h-4 w-4" aria-hidden /> Search
          </button>
          <Link href={user ? '/account/wishlist' : '/wishlist'} onClick={onClose} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white">
            <HeartIcon className="h-4 w-4" aria-hidden /> Wishlist
          </Link>
          <button onClick={() => {onClose();openCart();}} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white">
            <ShoppingBagIcon className="h-4 w-4" aria-hidden /> Cart ({count})
          </button>
          <Link href={user ? '/account' : '/login'} onClick={onClose} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white">
            <UserIcon className="h-4 w-4" aria-hidden /> {user ? 'Account' : 'Sign in'}
          </Link>
        </div>
      </nav>
    </Modal>);

}