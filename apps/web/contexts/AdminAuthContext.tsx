'use client';

import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUser, Permission } from '@/types/admin';
import type { Result } from '@/types/user';
import { adminChangePassword, adminSignIn, adminSignOut } from '@/lib/auth/admin-actions';

/**
 * The signed-in administrator, read on the server by the admin layouts (Supabase session + `admins` row) and
 * passed in here. `can()` only shapes the UI: every admin server action checks permissions again with
 * `requirePermission()`.
 */
interface AdminAuthValue {
  admin: AdminUser | null;
  /** Always true: the server has already resolved the session before rendering. */
  ready: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<Result>;
  logout: () => Promise<void>;
  can: (p: Permission) => boolean;
  changePassword: (current: string, next: string) => Promise<Result>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ admin, children }: { admin: AdminUser | null; children: React.ReactNode }) {
  const router = useRouter();

  const logout = async () => {
    await adminSignOut();
    router.refresh();
  };

  const can = (p: Permission) => !!admin && (admin.isOwner || admin.permissions.includes(p));

  return (
    <AdminAuthContext.Provider
      value={{ admin, ready: true, login: adminSignIn, logout, can, changePassword: adminChangePassword }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
