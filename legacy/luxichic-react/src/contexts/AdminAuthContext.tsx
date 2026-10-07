import React, { createContext, useContext, useState } from 'react';
import type { AdminUser, Permission } from '../types/admin';
import type { Result } from '../types/user';
import { findAdmin, getDb, logActivity, updateDb, useDb } from '../services/db';
import { generateId } from '../utils/references';
import { wait } from '../utils/validation';

/**
 * PROTOTYPE ADMIN AUTH
 * Credentials are checked in the browser against the mock store so the dashboard can be reviewed.
 * In production: replace `login` with a call to the backend auth endpoint (HTTP-only session cookie),
 * and enforce every permission server-side — hiding UI is not security.
 */
interface AdminAuthValue {
  admin: AdminUser | null;
  login: (email: string, password: string, remember: boolean) => Promise<Result>;
  logout: () => void;
  can: (p: Permission) => boolean;
  changePassword: (current: string, next: string) => Promise<Result>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);
const KEY = 'lx_admin_session';

function readSession() {
  return window.localStorage.getItem(KEY) ?? window.sessionStorage.getItem(KEY);
}

function describeDevice() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  const kind = /Mobi|iPhone|Android/.test(ua) ? 'Mobile' : 'Desktop';
  return { browser, device: `${os} · ${kind}` };
}

export function AdminAuthProvider({ children }: {children: React.ReactNode;}) {
  const [sessionId, setSessionId] = useState<string | null>(() => readSession());
  const admins = useDb((s) => s.admins);
  const admin = admins.find((a) => a.id === sessionId && a.status === 'active') ?? null;

  const login: AdminAuthValue['login'] = async (email, password, remember) => {
    await wait(900);
    const match = findAdmin(email);
    if (!match || match.password !== password) return { ok: false, error: 'Incorrect email or password.' };
    if (match.status !== 'active') return { ok: false, error: 'This administrator account is suspended. Contact the main administrator.' };
    const now = new Date().toISOString();
    const { browser, device } = describeDevice();
    updateDb((d) => {
      const a = d.admins.find((x) => x.id === match.id);
      if (a) a.lastLoginAt = now;
      d.loginHistory = [
      { id: generateId('login'), adminId: match.id, adminName: match.fullName, email: match.email, at: now, browser, device, location: 'Location provided by backend', current: true },
      ...d.loginHistory.map((l) => ({ ...l, current: false }))].
      slice(0, 100);
      logActivity(d, match, 'Security', 'Signed in', `${browser} · ${device}`);
    });
    window.localStorage.removeItem(KEY);
    window.sessionStorage.removeItem(KEY);
    (remember ? window.localStorage : window.sessionStorage).setItem(KEY, match.id);
    setSessionId(match.id);
    return { ok: true };
  };

  const logout = () => {
    if (admin) updateDb((d) => logActivity(d, admin, 'Security', 'Signed out'));
    window.localStorage.removeItem(KEY);
    window.sessionStorage.removeItem(KEY);
    setSessionId(null);
  };

  const can = (p: Permission) => !!admin && (admin.isOwner || admin.permissions.includes(p));

  const changePassword: AdminAuthValue['changePassword'] = async (current, next) => {
    await wait(700);
    const a = getDb().admins.find((x) => x.id === admin?.id);
    if (!a) return { ok: false, error: 'Not signed in.' };
    if (a.password !== current) return { ok: false, error: 'Your current password is incorrect.' };
    updateDb((d) => {
      const target = d.admins.find((x) => x.id === a.id);
      if (target) target.password = next;
      logActivity(d, a, 'Security', 'Changed password');
    });
    return { ok: true };
  };

  return <AdminAuthContext.Provider value={{ admin, login, logout, can, changePassword }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}