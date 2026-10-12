'use client';

import React, { createContext, useContext } from 'react';
import type { AdminReview } from '@/lib/reviews/queries';
import type { Order } from '@/types/order';
import type { Appointment } from '@/types/salon';
import type { User } from '@/types/user';

export interface CustomerNote {
  id: string;
  text: string;
  by: string;
  at: string;
}

export interface AdminCustomers {
  /** Registered customers (profiles with their addresses). */
  users: User[];
  orders: Order[];
  appointments: Appointment[];
  reviews: AdminReview[];
  /** Internal notes about the customer being viewed (detail page only). */
  notes?: CustomerNote[];
}

const AdminCustomersContext = createContext<AdminCustomers | null>(null);

/** Customers and what they've done, read on the server by the admin customer pages (uncached). */
export function AdminCustomersProvider({ value, children }: { value: AdminCustomers; children: React.ReactNode }) {
  return <AdminCustomersContext.Provider value={value}>{children}</AdminCustomersContext.Provider>;
}

export function useAdminCustomers(): AdminCustomers {
  const ctx = useContext(AdminCustomersContext);
  if (!ctx) throw new Error('useAdminCustomers must be used inside an admin customer page');
  return ctx;
}
