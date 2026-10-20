'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { toast } from 'sonner';
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
  /** Where staff sign in: the secret admin address when one is set (lib/auth/admin-gate.ts). */
  loginPath: string;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

const ACTIVE_KEY = 'lx_admin_active';

export function AdminAuthProvider({
  admin,
  idleMinutes,
  loginPath = '/admin/login',
  children,
}: {
  admin: AdminUser | null;
  /** Where staff sign in (from the server; the secret admin address when one is set). */
  loginPath?: string;
  /** Settings → Security: sign out after this long without activity in any admin tab. */
  idleMinutes?: number;
  children: React.ReactNode;
}) {
  const logout = async () => {
    await adminSignOut();
    window.location.assign(loginPath);
  };

  const lastActive = useRef(0);
  useEffect(() => {
    if (!admin || !idleMinutes) return;
    const read = () => {
      try {
        return Number(localStorage.getItem(ACTIVE_KEY)) || 0;
      } catch {
        return 0;
      }
    };
    const touch = () => {
      const now = Date.now();
      if (now - lastActive.current < 10_000) return;
      lastActive.current = now;
      try {
        localStorage.setItem(ACTIVE_KEY, String(now));
      } catch {}
    };
    lastActive.current = 0;
    touch();
    const events = ['pointerdown', 'keydown', 'scroll', 'mousemove', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    // Other tabs share the timestamp, so working in one tab keeps the others signed in.
    const timer = window.setInterval(async () => {
      if (Date.now() - Math.max(lastActive.current, read()) < idleMinutes * 60_000) return;
      window.clearInterval(timer);
      await adminSignOut();
      toast.info('Signed out', { description: 'You were inactive for a while. Please sign in again.' });
      window.location.assign(loginPath);
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
    };
  }, [admin, idleMinutes, loginPath]);

  const can = (p: Permission) => !!admin && (admin.isOwner || admin.permissions.includes(p));

  return (
    <AdminAuthContext.Provider
      value={{ admin, ready: true, login: adminSignIn, logout, can, changePassword: adminChangePassword, loginPath }}
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
