'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  BellIcon,
  BoxIcon,
  CalendarIcon,
  CheckCheckIcon,
  CreditCardIcon,
  MessageSquareIcon,
  PlugIcon,
  ShoppingBagIcon,
  UserIcon,
} from 'lucide-react';
import type { NotificationKind } from '@/types/admin';
import { useRouter } from 'next/navigation';
import { useAdminSettings } from '@/components/admin/AdminSettingsProvider';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { markNotifications as markOnServer, saveNotificationPrefs } from '@/lib/settings/admin-actions';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { FilterTabs } from '@/components/admin/ui/FilterTabs';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { Toggle } from '@/components/admin/ui/Toggle';
import { formatDateTime } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';

const icons: Record<NotificationKind, typeof BellIcon> = {
  order: ShoppingBagIcon,
  payment: CreditCardIcon,
  appointment: CalendarIcon,
  stock: BoxIcon,
  customer: UserIcon,
  review: MessageSquareIcon,
  integration: PlugIcon,
};

export function Notifications() {
  const router = useRouter();
  const admin = useAdminSettings();
  const list = admin.notifications;
  const prefs = admin.settings.notifications;
  const manages = useAdminAuth().can('settings.general');
  const markNotifications = async (ids: string[] | 'all', read = true) => {
    const res = await markOnServer(ids, read).catch(() => null);
    if (!res?.ok) return toast.error(res?.error ?? 'Could not update notifications.');
    router.refresh();
  };
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const shown = list.filter((n) => tab === 'all' || !n.read).sort((a, b) => b.at.localeCompare(a.at));
  const unread = list.filter((n) => !n.read).length;

  const setPref = (k: keyof typeof prefs, v: boolean) => {
    void saveNotificationPrefs({ ...prefs, [k]: v }).then((res) => {
      if (!res.ok) return toast.error(res.error ?? 'Could not save the preference.');
      toast.success('Preference saved');
      router.refresh();
    });
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={
          manages
            ? 'Alerts about orders, payments, bookings, stock and integrations.'
            : 'Alerts about the parts of the admin you work in.'
        }
        actions={
          unread > 0 && (
            <AdminButton icon={<CheckCheckIcon className="h-4 w-4" />} onClick={() => markNotifications('all')}>
              Mark all as read
            </AdminButton>
          )
        }
      />
      <div className={cn('grid grid-cols-1 gap-5', manages && 'lg:grid-cols-[minmax(0,1fr)_320px]')}>
        <div className="rounded-xl border border-line bg-white">
          <div className="border-b border-line p-3 sm:p-4">
            <FilterTabs
              label="Filter"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'all', label: 'All', count: list.length },
                { value: 'unread', label: 'Unread', count: unread },
              ]}
            />
          </div>
          {shown.length === 0 ? (
            <AdminEmpty
              icon={<BellIcon className="h-5 w-5" />}
              title={tab === 'unread' ? 'You’re all caught up' : 'No notifications yet'}
            />
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((n) => {
                const Icon = icons[n.kind];
                const body = (
                  <>
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        n.read ? 'bg-canvas text-subtle' : 'bg-pink/20 text-ink',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[13px]', n.read ? 'text-charcoal' : 'font-semibold text-ink')}>
                        {n.title}
                      </span>
                      <span className="block whitespace-pre-line text-xs text-subtle">{n.body}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-subtle">{formatDateTime(n.at)}</span>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-pink" aria-label="Unread" />}
                  </>
                );

                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => markNotifications([n.id])}
                        className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-canvas/50"
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        onClick={() => markNotifications([n.id], !n.read)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-canvas/50"
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {/* Store-wide: which events reach the team's bells. Only for admins who manage settings. */}
        {manages && (
          <Panel
            title="Team bell"
            description="Which events show in the team’s bells. Telegram has its own switches under Telegram."
          >
            <div className="space-y-3.5">
              <Toggle label="New orders" checked={prefs.newOrder} onChange={(v) => setPref('newOrder', v)} />
              <Toggle
                label="New appointments and changes"
                checked={prefs.newAppointment}
                onChange={(v) => setPref('newAppointment', v)}
              />
              <Toggle label="Low stock" checked={prefs.lowStock} onChange={(v) => setPref('lowStock', v)} />
              <Toggle label="New reviews" checked={prefs.newReview} onChange={(v) => setPref('newReview', v)} />
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
