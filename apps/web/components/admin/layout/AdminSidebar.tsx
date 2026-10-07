'use client';

import React from 'react';
import Link from 'next/link';
import { NavLink } from '@/components/ui/NavLink';
import { ChevronsLeftIcon, ExternalLinkIcon } from 'lucide-react';
import { adminNav } from '@/data/adminNav';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAdminBadges } from '@/hooks/useAdminBadges';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils/cn';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  /** Rendered inside the mobile drawer — always expanded. */
  mobile?: boolean;
}

export function AdminSidebar({ collapsed, onToggleCollapse, onNavigate, mobile }: AdminSidebarProps) {
  const { can } = useAdminAuth();
  const badges = useAdminBadges();
  const isCollapsed = collapsed && !mobile;

  return (
    <div className="flex h-full flex-col bg-ink text-white/70">
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-white/10',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        <Link
          href="/admin/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2"
          aria-label="LUXICHIC Admin home"
        >
          <Logo variant="main" className={isCollapsed ? 'h-7' : 'h-8'} />
          {!isCollapsed && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
              Admin
            </span>
          )}
        </Link>
        {!mobile && !isCollapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white lg:block"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-3" aria-label="Admin">
        {adminNav.map((group) => {
          const items = group.items.filter((i) => !i.permission || can(i.permission));
          if (!items.length) return null;
          return (
            <div key={group.label} className="mb-3">
              {!isCollapsed ? (
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                  {group.label}
                </p>
              ) : (
                <div className="mx-3 my-2 h-px bg-white/10" aria-hidden />
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const count = item.badge ? badges[item.badge] : 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        href={item.to}
                        onClick={onNavigate}
                        title={isCollapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex h-8 items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors duration-150',
                            isCollapsed ? 'justify-center px-0' : 'px-2.5',
                            isActive ? 'bg-pink text-ink' : 'hover:bg-white/[0.07] hover:text-white',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                            {count > 0 && !isCollapsed && (
                              <span
                                className={cn(
                                  'ml-auto rounded px-1.5 text-[11px] font-semibold tabular-nums',
                                  isActive ? 'bg-ink/15 text-ink' : 'bg-pink/20 text-pink',
                                )}
                              >
                                {count}
                              </span>
                            )}
                            {count > 0 && isCollapsed && (
                              <span
                                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-pink"
                                aria-label={`${count} pending`}
                              />
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium hover:bg-white/[0.07] hover:text-white',
            isCollapsed && 'justify-center px-0',
          )}
          title="Open storefront"
        >
          <ExternalLinkIcon className="h-4 w-4" aria-hidden />
          {!isCollapsed && 'View storefront'}
        </a>
      </div>
    </div>
  );
}
