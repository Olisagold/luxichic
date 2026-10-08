'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Address } from '@/types/order';
import type { Result, User } from '@/types/user';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { seedUsers } from '@/data/seed';
import { seedCustomers } from '@/data/adminSeed';
import { generateId } from '@/lib/utils/references';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';
import * as actions from '@/lib/auth/customer-actions';

/**
 * The signed-in customer comes from Supabase Auth (session cookies) and their profile in the database.
 * Every change goes through a server action that checks the session again.
 *
 * `users` and the `admin*` functions are still the prototype's customer list in local storage, used by the
 * admin screens until Phase 8 moves them to the database.
 */
interface AuthContextValue {
  user: User | null;
  /** False until the session has been checked on the client. */
  ready: boolean;
  /** Re-reads the signed-in account from the server. */
  refresh: () => Promise<void>;
  login: (email: string, password: string, remember: boolean) => Promise<Result>;
  logout: () => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<Result & { needsConfirmation?: boolean; exists?: boolean }>;
  isBlockedEmail: (email: string) => boolean;
  updateProfile: (data: {
    fullName: string;
    email: string;
    phone: string;
  }) => Promise<Result & { emailPending?: boolean }>;
  changePassword: (current: string, next: string) => Promise<Result>;
  saveAddress: (address: Address) => Promise<Result>;
  deleteAddress: (id: string) => Promise<Result>;
  setDefaultAddress: (id: string) => Promise<Result>;
  requestPasswordReset: (email: string) => Promise<Result>;
  /** Sets a new password from a reset link's recovery session. */
  resetPassword: (password: string) => Promise<Result>;
  /* admin prototype: customer list in local storage */
  users: User[];
  adminCreateCustomer: (data: {
    fullName: string;
    email: string;
    phone: string;
    address?: Address;
    status: 'active' | 'blocked';
  }) => Result;
  adminUpdateCustomer: (
    id: string,
    patch: Partial<Pick<User, 'fullName' | 'email' | 'phone' | 'status' | 'addresses'>>,
  ) => void;
  adminDeleteCustomer: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useLocalStorage<User[]>('lx_users_v3', () => [...seedUsers, ...seedCustomers]);

  const refresh = useCallback(async () => {
    try {
      setUser(await actions.fetchAccount());
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // The prototype kept sessions, customer passwords and reset tokens in local storage.
    try {
      ['lx_session', 'lx_users_v2', 'lx_reset_tokens', 'lx_admin_session'].forEach((k) => {
        window.localStorage.removeItem(k);
        window.sessionStorage.removeItem(k);
      });
    } catch {
      // Storage can be blocked; nothing to clean up then.
    }
    void refresh();
    if (!isSupabaseConfigured) return;
    // Keep other tabs and token refreshes in step with the server.
    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  // Run an action, then re-read the account so every screen sees the change.
  const thenRefresh =
    <A extends unknown[], R extends Result>(fn: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      const res = await fn(...args);
      if (res.ok) await refresh();
      return res;
    };

  const logout = async () => {
    await actions.signOut();
    setUser(null);
  };

  const isBlockedEmail = (email: string) => users.some((u) => same(u.email, email) && u.status === 'blocked');

  /* -------- admin prototype (moves to server actions in Phase 8) -------- */

  const adminCreateCustomer: AuthContextValue['adminCreateCustomer'] = (data) => {
    if (users.some((u) => same(u.email, data.email))) {
      return { ok: false, error: 'A customer with this email already exists.' };
    }
    setUsers((prev) => [
      ...prev,
      {
        id: generateId('u'),
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        addresses: data.address ? [{ ...data.address, isDefault: true }] : [],
        createdAt: new Date().toISOString(),
        status: data.status,
        // The customer sets their own password from a secure setup link.
        pendingSetup: true,
      },
    ]);
    return { ok: true };
  };

  const adminUpdateCustomer: AuthContextValue['adminUpdateCustomer'] = (id, patch) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const adminDeleteCustomer = (id: string) => setUsers((prev) => prev.filter((u) => u.id !== id));

  return (
    <AuthContext.Provider
      value={{
        ready,
        user,
        refresh,
        login: thenRefresh(actions.signIn),
        logout,
        register: thenRefresh(actions.signUp),
        isBlockedEmail,
        updateProfile: thenRefresh(actions.updateProfile),
        changePassword: actions.changePassword,
        saveAddress: thenRefresh(actions.saveAddress),
        deleteAddress: thenRefresh(actions.deleteAddress),
        setDefaultAddress: thenRefresh(actions.setDefaultAddress),
        requestPasswordReset: actions.requestPasswordReset,
        resetPassword: thenRefresh(actions.setNewPassword),
        users,
        adminCreateCustomer,
        adminUpdateCustomer,
        adminDeleteCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
