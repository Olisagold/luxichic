'use client';

import React, { createContext, useContext } from 'react';
import type { AdminService, AvailabilityBlock, Specialist } from '@/types/admin';
import type { Appointment } from '@/types/salon';

export interface AdminSalon {
  appointments: Appointment[];
  /** Every service and specialist in any status. */
  services: AdminService[];
  specialists: Specialist[];
  /** Closed days and hours, today onwards. */
  blocks: AvailabilityBlock[];
  /** The business WhatsApp number (Settings → Business), the default for a new service. */
  whatsapp: string;
  /** Set for a specialist's own login: the only specialist whose bookings they see and manage. */
  scope: string | null;
}

const AdminSalonContext = createContext<AdminSalon | null>(null);

/** The salon for the admin salon pages, read on the server by each page (uncached). */
export function AdminSalonProvider({ value, children }: { value: AdminSalon; children: React.ReactNode }) {
  return <AdminSalonContext.Provider value={value}>{children}</AdminSalonContext.Provider>;
}

export function useAdminSalon(): AdminSalon {
  const ctx = useContext(AdminSalonContext);
  if (!ctx) throw new Error('useAdminSalon must be used inside an admin salon page');
  return ctx;
}
