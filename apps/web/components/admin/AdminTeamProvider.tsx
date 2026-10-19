'use client';

import React, { createContext, useContext } from 'react';
import type { ActivityEntry, AdminUser } from '@/types/admin';

export interface AdminTeam {
  admins: AdminUser[];
  /** The latest entries in the activity log (activity page only). */
  activity: ActivityEntry[];
  /** Specialist profiles a login can be linked to (Admin users). */
  specialists: { id: string; name: string; title: string }[];
}

const AdminTeamContext = createContext<AdminTeam | null>(null);

/** Admin users and the activity log for the administration pages, read on the server (uncached). */
export function AdminTeamProvider({ value, children }: { value: AdminTeam; children: React.ReactNode }) {
  return <AdminTeamContext.Provider value={value}>{children}</AdminTeamContext.Provider>;
}

export function useAdminTeam(): AdminTeam {
  const ctx = useContext(AdminTeamContext);
  if (!ctx) throw new Error('useAdminTeam must be used inside an administration page');
  return ctx;
}
