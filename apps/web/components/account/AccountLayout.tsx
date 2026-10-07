'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navigate } from '@/components/ui/Navigate';
import { NavLink } from '@/components/ui/NavLink';
import {
  CalendarIcon,
  HeartIcon,
  LayoutGridIcon,
  LogOutIcon,
  MapPinIcon,
  PackageIcon,
  StarIcon,
  UserCogIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/cn';

const links = [
  { to: '/account', label: 'Overview', icon: LayoutGridIcon, end: true },
  { to: '/account/orders', label: 'Orders', icon: PackageIcon },
  { to: '/account/appointments', label: 'Appointments', icon: CalendarIcon },
  { to: '/account/wishlist', label: 'Wishlist', icon: HeartIcon },
  { to: '/account/addresses', label: 'Addresses', icon: MapPinIcon },
  { to: '/account/reviews', label: 'Reviews', icon: StarIcon },
  { to: '/account/profile', label: 'Profile', icon: UserCogIcon },
];

export function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!ready) return <div className="min-h-[60vh]" aria-busy="true" />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(pathname)}`} replace />;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
        <aside className="lg:sticky lg:top-28 lg:h-fit" aria-label="Account navigation">
          <div className="hidden lg:block">
            <p className="text-xs text-subtle">Signed in as</p>
            <p className="mt-0.5 truncate font-display text-2xl text-ink">{user.fullName}</p>
          </div>
          <nav className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:mt-6 lg:flex-col lg:gap-1 lg:px-0">
            {links.map((l) => (
              <NavLink
                key={l.to}
                href={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-3 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 lg:rounded-xl',
                    isActive
                      ? 'bg-ink text-white'
                      : 'border border-line bg-white text-charcoal hover:border-ink lg:border-transparent lg:bg-transparent lg:hover:bg-white',
                  )
                }
              >
                <l.icon className="h-4 w-4" aria-hidden /> {l.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium text-subtle hover:text-ink lg:mt-4 lg:rounded-xl lg:border-transparent lg:bg-transparent"
            >
              <LogOutIcon className="h-4 w-4" aria-hidden /> Sign out
            </button>
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
