import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarIcon, SearchIcon, XIcon } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { cn } from '../../utils/cn';

const config = {
  hairs: {
    home: '/hairs',
    name: 'LUXICHIC Hairs',
    links: [
    { label: 'Shop All', to: '/hairs/shop/all' },
    { label: 'Wigs', to: '/hairs/shop/wigs' },
    { label: 'Frontals', to: '/hairs/shop/frontals' },
    { label: 'Closures', to: '/hairs/shop/closures' },
    { label: 'Bundles', to: '/hairs/shop/bundles' },
    { label: 'Bone Straight', to: '/hairs/shop/bone-straight' },
    { label: 'Body Wave', to: '/hairs/shop/body-wave' },
    { label: 'New Arrivals', to: '/hairs/shop/new-arrivals' },
    { label: 'Sale', to: '/hairs/shop/discounted' }]

  },
  tools: {
    home: '/tools',
    name: 'Hair Tools & Essentials',
    links: [
    { label: 'Shop All', to: '/tools/shop/all' },
    { label: 'Styling Tools', to: '/tools/shop/styling-tools' },
    { label: 'Wig-Making', to: '/tools/shop/wig-making' },
    { label: 'Salon Essentials', to: '/tools/shop/salon-essentials' },
    { label: 'Haircare', to: '/tools/shop/haircare' },
    { label: 'Braiding', to: '/tools/shop/braiding' },
    { label: 'New Arrivals', to: '/tools/shop/new-arrivals' },
    { label: 'Offers', to: '/tools/shop/discounted' }]

  },
  salon: {
    home: '/salon',
    name: 'Beauty Salon & Spa',
    links: [
    { label: 'All Services', to: '/salon/services' },
    { label: 'Nails', to: '/salon/services/nail-services' },
    { label: 'Manicure', to: '/salon/services/manicure' },
    { label: 'Pedicure', to: '/salon/services/pedicure' },
    { label: 'Facials', to: '/salon/services/facials' },
    { label: 'Lashes', to: '/salon/services/eyelash-extensions' },
    { label: 'Braiding', to: '/salon/services/braiding' },
    { label: 'Wig Services', to: '/salon/services/wig-installation' }]

  }
};

const ease = [0.23, 1, 0.32, 1] as const;

/**
 * Store-level navigation. Sits on the page (not as a second dark bar) as a
 * floating pill with a sliding active indicator, so the black header stays
 * the single site menu.
 */
export function DivisionHeader() {
  const { pathname } = useLocation();
  const key = (['hairs', 'tools', 'salon'] as const).find((k) => pathname.startsWith(`/${k}`));
  const navigate = useNavigate();
  const { addRecentSearch } = useUI();
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);

  if (!key) return null;
  const c = config[key];
  const links = [{ label: key === 'salon' ? 'Overview' : 'Store Home', to: c.home }, ...c.links];
  const activeTo = links.find((l) => l.to === pathname)?.to;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    addRecentSearch(q);
    navigate(`/search?q=${encodeURIComponent(q.trim())}&scope=${key}`);
    setSearching(false);
    setQ('');
  };

  return (
    <div className="bg-ivory">
      <div className="mx-auto max-w-7xl px-5 pt-4 lg:px-8">
        <div className="flex items-center gap-2 rounded-full border border-line bg-white p-1.5 shadow-soft">
          <Link
            to={c.home}
            className="hidden shrink-0 items-center gap-2 rounded-full bg-ink py-2 pl-3 pr-4 text-white md:flex"
            aria-label={`${c.name} home`}>
            
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-pink" />
            </span>
            <span className="whitespace-nowrap font-display text-[17px] italic leading-none">{c.name}</span>
          </Link>

          {searching ?
          <form onSubmit={submit} role="search" className="flex flex-1 items-center gap-2 px-2">
              <SearchIcon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
              <label htmlFor={`div-search-${key}`} className="sr-only">Search {c.name}</label>
              <input
              id={`div-search-${key}`}
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearching(false)}
              placeholder={key === 'hairs' ? 'Search wigs, textures, lengths…' : 'Search tools, haircare…'}
              className="h-9 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none" />
            
              <button type="button" onClick={() => setSearching(false)} className="rounded-full p-2 text-subtle hover:bg-canvas hover:text-ink" aria-label="Close search">
                <XIcon className="h-4 w-4" />
              </button>
            </form> :

          <nav aria-label={`${c.name} navigation`} className="no-scrollbar flex flex-1 items-center overflow-x-auto">
              {links.map((l) => {
              const active = l.to === activeTo;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-colors duration-150',
                    active ? 'text-white' : 'text-charcoal hover:text-pink-deep'
                  )}>
                  
                    {active &&
                  <motion.span
                    layoutId="division-pill"
                    className="absolute inset-0 rounded-full bg-pink-deep shadow-[0_6px_18px_-6px_rgba(240,40,140,0.7)]"
                    transition={{ duration: 0.28, ease }}
                    aria-hidden />

                  }
                    <span className="relative">{l.label}</span>
                  </Link>);

            })}
            </nav>
          }

          {key === 'salon' ?
          <Link
            to="/salon/book"
            className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-[12px] font-bold text-white transition-colors duration-150 hover:bg-charcoal">
            
              <CalendarIcon className="h-3.5 w-3.5 text-pink" aria-hidden />
              <span className="hidden sm:inline">Book Now</span>
            </Link> :

          !searching &&
          <button
            onClick={() => setSearching(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-ink transition-colors duration-150 hover:bg-blush"
            aria-label={`Search ${c.name}`}>
            
                <SearchIcon className="h-4 w-4" />
              </button>

          }
        </div>
      </div>
    </div>);

}