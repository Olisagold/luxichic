'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BellIcon,
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  PanelLeftIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useDb } from '@/lib/mock-db/db';
import { markNotifications } from '@/lib/mock-db/settings';
import { quickActions } from '@/data/adminNav';
import { initials } from '@/lib/utils/text';
import { formatDateTime } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';

interface AdminTopbarProps {
  onOpenMobileNav: () => void;
  onToggleCollapse: () => void;
  onOpenSearch: () => void;
}

const pop = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] },
};

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

export function AdminTopbar({ onOpenMobileNav, onToggleCollapse, onOpenSearch }: AdminTopbarProps) {
  const { admin, logout, can } = useAdminAuth();
  const router = useRouter();
  const notifications = useDb((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;
  const [menu, setMenu] = useState<'none' | 'notifications' | 'profile' | 'quick'>('none');
  const close = React.useCallback(() => setMenu('none'), []);
  const ref = useOutside(menu !== 'none', close);

  const actions = quickActions.filter((a) => !a.permission || can(a.permission));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-white/95 px-3 backdrop-blur sm:px-5">
      <button
        onClick={onOpenMobileNav}
        className="rounded-md p-2 text-charcoal hover:bg-canvas lg:hidden"
        aria-label="Open navigation"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      <button
        onClick={onToggleCollapse}
        className="hidden rounded-md p-2 text-charcoal hover:bg-canvas lg:block"
        aria-label="Toggle sidebar"
      >
        <PanelLeftIcon className="h-4 w-4" />
      </button>

      <button
        onClick={onOpenSearch}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-canvas/60 px-3 text-left text-[13px] text-muted transition-colors duration-150 hover:border-ink/30 sm:max-w-md"
        aria-label="Search the admin"
      >
        <SearchIcon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">Search orders, references, customers…</span>
        <kbd className="ml-auto hidden rounded border border-line bg-white px-1.5 text-[10px] font-semibold text-subtle sm:block">
          ⌘K
        </kbd>
      </button>

      <div ref={ref} className="ml-auto flex items-center gap-1">
        <div className="relative hidden sm:block">
          <button
            onClick={() => setMenu(menu === 'quick' ? 'none' : 'quick')}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-charcoal"
            aria-expanded={menu === 'quick'}
          >
            <PlusIcon className="h-4 w-4" aria-hidden /> Quick action
          </button>
          <AnimatePresence>
            {menu === 'quick' && (
              <motion.div
                {...pop}
                className="absolute right-0 top-11 w-60 rounded-xl border border-line bg-white p-1.5 shadow-soft"
              >
                {actions.map((a) => (
                  <Link
                    key={a.to}
                    href={a.to}
                    onClick={close}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-charcoal hover:bg-canvas"
                  >
                    <a.icon className="h-4 w-4 text-subtle" aria-hidden /> {a.label}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenu(menu === 'notifications' ? 'none' : 'notifications')}
            className="relative rounded-lg p-2 text-charcoal hover:bg-canvas"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            aria-expanded={menu === 'notifications'}
          >
            <BellIcon className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-ink">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <AnimatePresence>
            {menu === 'notifications' && (
              <motion.div
                {...pop}
                className="absolute right-0 top-11 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-line bg-white shadow-soft"
              >
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <p className="text-sm font-semibold text-ink">Notifications</p>
                  {unread > 0 && (
                    <button
                      onClick={() => markNotifications('all')}
                      className="text-xs font-semibold text-pink-deep hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <ul className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 8).map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => {
                          markNotifications([n.id]);
                          close();
                          if (n.link) router.push(n.link);
                        }}
                        className="flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left last:border-0 hover:bg-canvas/60"
                      >
                        <span
                          className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-pink')}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-ink">{n.title}</span>
                          <span className="block truncate text-xs text-subtle">{n.body}</span>
                          <span className="mt-0.5 block text-[11px] text-muted">{formatDateTime(n.at)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {notifications.length === 0 && (
                    <li className="px-4 py-8 text-center text-[13px] text-subtle">You’re all caught up.</li>
                  )}
                </ul>
                <Link
                  href="/admin/notifications"
                  onClick={close}
                  className="block border-t border-line px-4 py-2.5 text-center text-xs font-semibold text-ink hover:bg-canvas"
                >
                  View all notifications
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenu(menu === 'profile' ? 'none' : 'profile')}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-canvas"
            aria-expanded={menu === 'profile'}
            aria-label="Account menu"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-pink">
              {initials(admin?.fullName ?? 'A')}
            </span>
            <span className="hidden text-left md:block">
              <span className="block text-[13px] font-semibold leading-tight text-ink">{admin?.fullName}</span>
              <span className="block text-[11px] leading-tight text-subtle">
                {admin?.isOwner ? 'Main Administrator' : admin?.role}
              </span>
            </span>
            <ChevronDownIcon className="hidden h-3.5 w-3.5 text-subtle md:block" aria-hidden />
          </button>
          <AnimatePresence>
            {menu === 'profile' && (
              <motion.div
                {...pop}
                className="absolute right-0 top-11 w-56 rounded-xl border border-line bg-white p-1.5 shadow-soft"
              >
                <div className="px-2.5 py-2">
                  <p className="truncate text-[13px] font-semibold text-ink">{admin?.fullName}</p>
                  <p className="truncate text-xs text-subtle">{admin?.email}</p>
                </div>
                <Link
                  href="/admin/settings/security"
                  onClick={close}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-charcoal hover:bg-canvas"
                >
                  <ShieldCheckIcon className="h-4 w-4 text-subtle" aria-hidden /> Security & sessions
                </Link>
                <button
                  onClick={() => {
                    logout();
                    router.push('/admin/login');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-red-700 hover:bg-red-50"
                >
                  <LogOutIcon className="h-4 w-4" aria-hidden /> Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
