'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Address } from '@/types/order';
import type { Result, User } from '@/types/user';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';
import * as actions from '@/lib/auth/customer-actions';

/**
 * The signed-in customer comes from Supabase Auth (session cookies) and their profile in the database.
 * Every change goes through a server action that checks the session again.
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

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
    // The prototype kept sessions, passwords, reset tokens and demo records in local storage.
    try {
      [
        'lx_session',
        'lx_users_v2',
        'lx_reset_tokens',
        'lx_admin_session',
        'lx_users_v3',
        'lx_orders_v2',
        'lx_appointments_v2',
        'lx_reviews_v2',
        'lx_store_v1',
      ].forEach((k) => {
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

  return (
    <AuthContext.Provider
      value={{
        ready,
        user,
        refresh,
        login: thenRefresh(actions.signIn),
        logout,
        register: thenRefresh(actions.signUp),
        updateProfile: thenRefresh(actions.updateProfile),
        changePassword: actions.changePassword,
        saveAddress: thenRefresh(actions.saveAddress),
        deleteAddress: thenRefresh(actions.deleteAddress),
        setDefaultAddress: thenRefresh(actions.setDefaultAddress),
        requestPasswordReset: actions.requestPasswordReset,
        resetPassword: thenRefresh(actions.setNewPassword),
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
