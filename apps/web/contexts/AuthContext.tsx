'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Address } from '@/types/order';
import type { Result, User } from '@/types/user';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { seedUsers } from '@/data/seed';
import { seedCustomers } from '@/data/adminSeed';
import { generateId, generateToken } from '@/lib/utils/references';
import { wait } from '@/lib/utils/validation';
import { pushNotification, updateDb } from '@/lib/mock-db/db';

/**
 * PROTOTYPE AUTH — simulates accounts in local storage so customer journeys can be demonstrated.
 * In production, the backend owns authentication, password hashing, tokens and email delivery.
 */
interface AuthContextValue {
  user: User | null;
  /** False until the stored session has been read on the client. */
  ready: boolean;
  /** All customer accounts — exposed for the admin prototype only. */
  users: User[];
  login: (email: string, password: string, remember: boolean) => Promise<Result>;
  logout: () => void;
  register: (data: {fullName: string;email: string;phone: string;password: string;}) => Promise<Result>;
  emailExists: (email: string) => boolean;
  isBlockedEmail: (email: string) => boolean;
  updateProfile: (data: {fullName: string;email: string;phone: string;}) => Promise<Result>;
  changePassword: (current: string, next: string) => Promise<Result>;
  saveAddress: (address: Address) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  requestPasswordReset: (email: string) => Promise<string | null>;
  isValidResetToken: (token: string) => boolean;
  resetPassword: (token: string, password: string) => Promise<Result>;
  /* admin operations */
  adminCreateCustomer: (data: {fullName: string;email: string;phone: string;address?: Address;status: 'active' | 'blocked';}) => Result;
  adminUpdateCustomer: (id: string, patch: Partial<Pick<User, 'fullName' | 'email' | 'phone' | 'status' | 'addresses'>>) => void;
  adminDeleteCustomer: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function readSession(): string | null {
  return window.localStorage.getItem('lx_session') ?? window.sessionStorage.getItem('lx_session');
}

export function AuthProvider({ children }: {children: React.ReactNode;}) {
  const [users, setUsers, usersLoaded] = useLocalStorage<User[]>('lx_users_v2', () => [...seedUsers, ...seedCustomers]);
  const [resetTokens, setResetTokens] = useLocalStorage<Record<string, {email: string;expiresAt: string;}>>('lx_reset_tokens', {});
  const [sessionEmail, setSessionEmailState] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const ready = usersLoaded && sessionLoaded;

  useEffect(() => {
    setSessionEmailState(readSession());
    setSessionLoaded(true);
  }, []);

  const setSessionEmail = (email: string | null, remember = true) => {
    window.localStorage.removeItem('lx_session');
    window.sessionStorage.removeItem('lx_session');
    if (email) (remember ? window.localStorage : window.sessionStorage).setItem('lx_session', email);
    setSessionEmailState(email);
  };

  const sessionUser = sessionEmail ? users.find((u) => same(u.email, sessionEmail)) ?? null : null;
  // Blocked customers are treated as signed out everywhere.
  const user = sessionUser && sessionUser.status !== 'blocked' ? sessionUser : null;
  const emailExists = (email: string) => users.some((u) => same(u.email, email));
  const isBlockedEmail = (email: string) => users.some((u) => same(u.email, email) && u.status === 'blocked');

  const login: AuthContextValue['login'] = async (email, password, remember) => {
    await wait(800);
    const match = users.find((u) => same(u.email, email));
    if (!match || match.password !== password) return { ok: false, error: 'The email or password you entered is incorrect.' };
    if (match.status === 'blocked') return { ok: false, error: 'This account has been suspended. Please contact LUXICHIC for help.' };
    setSessionEmail(match.email, remember);
    setUsers((prev) => prev.map((u) => u.id === match.id ? { ...u, lastActiveAt: new Date().toISOString() } : u));
    return { ok: true };
  };

  const logout = () => setSessionEmail(null);

  const register: AuthContextValue['register'] = async (data) => {
    await wait(800);
    const existing = users.find((u) => same(u.email, data.email));
    if (existing && !existing.pendingSetup) return { ok: false, error: 'An account with this email already exists. Please sign in instead.' };
    if (existing?.status === 'blocked') return { ok: false, error: 'This account has been suspended. Please contact LUXICHIC for help.' };
    const now = new Date().toISOString();
    const newUser: User = {
      id: existing?.id ?? generateId('u'),
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      password: data.password,
      addresses: existing?.addresses ?? [],
      createdAt: existing?.createdAt ?? now,
      lastActiveAt: now,
      status: 'active'
    };
    setUsers((prev) => existing ? prev.map((u) => u.id === existing.id ? newUser : u) : [...prev, newUser]);
    setSessionEmail(newUser.email);
    updateDb((d) => pushNotification(d, { kind: 'customer', title: 'New customer', body: `${newUser.fullName} created an account.`, link: '/admin/customers' }));
    return { ok: true };
  };

  const patchUser = (fn: (u: User) => User) => {
    if (!user) return;
    setUsers((prev) => prev.map((u) => u.id === user.id ? fn(u) : u));
  };

  const updateProfile: AuthContextValue['updateProfile'] = async (data) => {
    await wait(600);
    if (!user) return { ok: false, error: 'You are not signed in.' };
    if (!same(data.email, user.email) && emailExists(data.email)) {
      return { ok: false, error: 'That email is already in use by another account.' };
    }
    patchUser((u) => ({ ...u, fullName: data.fullName.trim(), email: data.email.trim(), phone: data.phone.trim() }));
    setSessionEmail(data.email.trim());
    return { ok: true };
  };

  const changePassword: AuthContextValue['changePassword'] = async (current, next) => {
    await wait(600);
    if (!user) return { ok: false, error: 'You are not signed in.' };
    if (user.password !== current) return { ok: false, error: 'Your current password is incorrect.' };
    patchUser((u) => ({ ...u, password: next }));
    return { ok: true };
  };

  const saveAddress = (address: Address) =>
  patchUser((u) => {
    const exists = u.addresses.some((a) => a.id === address.id);
    let list = exists ? u.addresses.map((a) => a.id === address.id ? address : a) : [...u.addresses, address];
    if (address.isDefault || list.length === 1) list = list.map((a) => ({ ...a, isDefault: a.id === address.id }));
    return { ...u, addresses: list };
  });

  const deleteAddress = (id: string) =>
  patchUser((u) => {
    let list = u.addresses.filter((a) => a.id !== id);
    if (list.length && !list.some((a) => a.isDefault)) list = list.map((a, i) => ({ ...a, isDefault: i === 0 }));
    return { ...u, addresses: list };
  });

  const setDefaultAddress = (id: string) =>
  patchUser((u) => ({ ...u, addresses: u.addresses.map((a) => ({ ...a, isDefault: a.id === id })) }));

  const requestPasswordReset = async (email: string) => {
    await wait(800);
    if (!emailExists(email)) return null;
    const token = generateToken();
    setResetTokens((prev) => ({
      ...prev,
      [token]: { email: email.trim(), expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }
    }));
    return token;
  };

  const isValidResetToken = (token: string) => {
    const entry = resetTokens[token];
    return !!entry && new Date(entry.expiresAt).getTime() > Date.now();
  };

  const resetPassword: AuthContextValue['resetPassword'] = async (token, password) => {
    await wait(700);
    const entry = resetTokens[token];
    if (!entry || new Date(entry.expiresAt).getTime() < Date.now()) {
      return { ok: false, error: 'This reset link is invalid or has expired. Please request a new one.' };
    }
    setUsers((prev) => prev.map((u) => same(u.email, entry.email) ? { ...u, password, pendingSetup: false } : u));
    setResetTokens((prev) => {
      const next = { ...prev };
      delete next[token];
      return next;
    });
    return { ok: true };
  };

  /* -------- admin (prototype; enforce server-side in production) -------- */

  const adminCreateCustomer: AuthContextValue['adminCreateCustomer'] = (data) => {
    if (emailExists(data.email)) return { ok: false, error: 'A customer with this email already exists.' };
    const now = new Date().toISOString();
    setUsers((prev) => [
    ...prev,
    {
      id: generateId('u'), fullName: data.fullName.trim(), email: data.email.trim(), phone: data.phone.trim(),
      // No password is set by admins — the customer receives a secure setup link.
      password: generateToken(),
      addresses: data.address ? [{ ...data.address, isDefault: true }] : [],
      createdAt: now, status: data.status, pendingSetup: true
    }]
    );
    return { ok: true };
  };

  const adminUpdateCustomer: AuthContextValue['adminUpdateCustomer'] = (id, patch) =>
  setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u));

  const adminDeleteCustomer = (id: string) => setUsers((prev) => prev.filter((u) => u.id !== id));

  return (
    <AuthContext.Provider
      value={{
        ready,
        user, users, login, logout, register, emailExists, isBlockedEmail, updateProfile, changePassword,
        saveAddress, deleteAddress, setDefaultAddress, requestPasswordReset, isValidResetToken, resetPassword,
        adminCreateCustomer, adminUpdateCustomer, adminDeleteCustomer
      }}>
      
      {children}
    </AuthContext.Provider>);

}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}