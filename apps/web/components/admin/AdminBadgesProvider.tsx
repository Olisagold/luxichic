'use client';

import React, { createContext, useContext } from 'react';
import type { NavBadge } from '@/data/adminNav';
import type { AdminNotification } from '@/types/admin';

export interface AdminBadges {
  /** Sidebar badge counts. */
  counts: Record<NavBadge, number>;
  /** The latest notifications for the topbar bell. */
  notifications: AdminNotification[];
}

const EMPTY: AdminBadges = {
  counts: { pendingOrders: 0, pendingAppointments: 0, lowStock: 0, unread: 0, hiddenReviews: 0 },
  notifications: [],
};

const AdminBadgesContext = createContext<AdminBadges>(EMPTY);

/** Counts for the admin shell, read on the server by the admin layout (refreshed by `router.refresh()`). */
export function AdminBadgesProvider({ value, children }: { value: AdminBadges; children: React.ReactNode }) {
  return <AdminBadgesContext.Provider value={value}>{children}</AdminBadgesContext.Provider>;
}

export function useAdminBadges(): AdminBadges {
  return useContext(AdminBadgesContext);
}
