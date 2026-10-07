'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { NavLink } from '@/components/ui/NavLink';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, HeartIcon, MenuIcon, SearchIcon, ShoppingBagIcon, UserIcon } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { MegaMenu } from '@/components/layout/MegaMenu';
import { MobileNavigation } from '@/components/layout/MobileNavigation';
import { megaMenus } from '@/data/navigation';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { cn } from '@/lib/utils/cn';

const shortLabels: Record<string, [string, string]> = {
  hairs: ['LUXICHIC ', 'Hairs'],
  tools: ['Hair ', 'Tools & Essentials'],
  salon: ['Beauty ', 'Salon & Spa'],
};

export function MainHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const pathname = usePathname();
  const { count } = useCart();
  const { ids } = useWishlist();
  const { user } = useAuth();
  const { openCart, openSearch } = useUI();

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenMenu(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const enter = (id: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenMenu(id);
  };
  const leave = () => {
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 120);
  };

  const navText = 'text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-150';
  const iconBtn =
    'relative flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/10';
  const activeMenu = megaMenus.find((m) => m.id === openMenu);

  return (
    <header className="sticky top-0 z-50 bg-ink text-white" onMouseLeave={leave}>
      <div className="mx-auto flex h-[72px] max-w-site items-center gap-4 px-5 lg:px-8">
        <button onClick={() => setMobileOpen(true)} className={cn(iconBtn, '-ml-2 lg:hidden')} aria-label="Open menu">
          <MenuIcon className="h-5 w-5" />
        </button>
        <Link href="/" aria-label="LUXICHIC home" className="shrink-0">
          <Logo variant="main" className="h-11 md:h-12" />
        </Link>

        <nav aria-label="Main" className="ml-6 hidden flex-1 items-center gap-6 lg:flex xl:gap-7">
          <NavLink
            href="/"
            end
            className={({ isActive }) => cn(navText, isActive ? 'text-pink' : 'text-white/80 hover:text-white')}
          >
            Home
          </NavLink>
          {megaMenus.map((m) => {
            const isActive = pathname.startsWith(m.to);
            const [prefix, main] = shortLabels[m.id];
            return (
              <div key={m.id} onMouseEnter={() => enter(m.id)} className="flex h-[72px] items-center">
                <Link
                  href={m.to}
                  className={cn(
                    navText,
                    'flex items-center gap-1 whitespace-nowrap',
                    isActive || openMenu === m.id ? 'text-pink' : 'text-white/80 hover:text-white',
                  )}
                >
                  <span className="hidden xl:inline">{prefix}</span>
                  {main}
                </Link>
                <button
                  onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                  aria-expanded={openMenu === m.id}
                  aria-controls={`mega-${m.id}`}
                  aria-label={`${m.label} menu`}
                  className="ml-0.5 rounded p-0.5 text-white/60 hover:text-white"
                >
                  <ChevronDownIcon
                    className={cn(
                      'h-3.5 w-3.5 transition-transform duration-200 ease-lux',
                      openMenu === m.id && 'rotate-180',
                    )}
                  />
                </button>
              </div>
            );
          })}
          <NavLink
            href="/about"
            onMouseEnter={() => setOpenMenu(null)}
            className={({ isActive }) => cn(navText, isActive ? 'text-pink' : 'text-white/80 hover:text-white')}
          >
            About
          </NavLink>
          <NavLink
            href="/contact"
            onMouseEnter={() => setOpenMenu(null)}
            className={({ isActive }) => cn(navText, isActive ? 'text-pink' : 'text-white/80 hover:text-white')}
          >
            Contact
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <button onClick={openSearch} className={iconBtn} aria-label="Search products">
            <SearchIcon className="h-[18px] w-[18px]" />
          </button>
          <Link
            href={user ? '/account/wishlist' : '/wishlist'}
            className={cn(iconBtn, 'hidden sm:flex')}
            aria-label={`Wishlist, ${ids.length} items`}
          >
            <HeartIcon className="h-[18px] w-[18px]" />
            {ids.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-pink" aria-hidden />}
          </Link>
          <Link href={user ? '/account' : '/login'} className={iconBtn} aria-label={user ? 'My account' : 'Sign in'}>
            <UserIcon className="h-[18px] w-[18px]" />
          </Link>
          <button onClick={openCart} className={iconBtn} aria-label={`Shopping cart, ${count} items`}>
            <ShoppingBagIcon className="h-[18px] w-[18px]" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute -right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold tabular-nums text-ink"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {activeMenu && (
          <div onMouseEnter={() => enter(activeMenu.id)} className="hidden lg:block">
            <MegaMenu key={activeMenu.id} menu={activeMenu} onNavigate={() => setOpenMenu(null)} />
          </div>
        )}
      </AnimatePresence>

      <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
