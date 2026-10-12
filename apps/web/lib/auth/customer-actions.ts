'use server';

import { cookies } from 'next/headers';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { addresses, profiles } from '@/db/schema';
import { authErrorMessage, authReady, NOT_CONFIGURED, passwordMatches, siteOrigin } from '@/lib/auth/helpers';
import { getCustomer } from '@/lib/auth/session';
import { linkGuestOrders } from '@/lib/orders/link';
import { REMEMBER_COOKIE } from '@/lib/supabase/cookies';
import { createClient } from '@/lib/supabase/server';
import { isValidEmail, isValidPhone, passwordError } from '@/lib/utils/validation';
import type { Address } from '@/types/order';
import type { Result, User } from '@/types/user';

const SUSPENDED = 'This account has been suspended. Please contact LUXICHIC for help.';

/** The signed-in customer, for the account context on the client. */
export async function fetchAccount(): Promise<User | null> {
  return authReady() ? getCustomer() : null;
}

export async function signIn(email: string, password: string, remember: boolean): Promise<Result> {
  if (!authReady()) return NOT_CONFIGURED;
  if (!isValidEmail(email) || !password) return { ok: false, error: 'The email or password you entered is incorrect.' };

  const store = await cookies();
  store.set(REMEMBER_COOKIE, remember ? '1' : '0', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(remember ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  });

  const supabase = await createClient({ remember });
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) return { ok: false, error: authErrorMessage(error, 'Sign in failed.') };

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, data.user.id));
  if (!profile || profile.status === 'blocked') {
    await supabase.auth.signOut();
    // Admin logins have no customer profile.
    return { ok: false, error: profile ? SUSPENDED : 'The email or password you entered is incorrect.' };
  }
  await db.update(profiles).set({ lastActiveAt: new Date() }).where(eq(profiles.id, profile.id));
  await linkGuestOrders(data.user);
  return { ok: true };
}

export async function signUp(data: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<Result & { needsConfirmation?: boolean; exists?: boolean }> {
  if (!authReady()) return NOT_CONFIGURED;
  const fullName = data.fullName.trim();
  const email = data.email.trim();
  const phone = data.phone.trim();
  if (fullName.length < 2) return { ok: false, error: 'Please enter your full name.' };
  if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!isValidPhone(phone)) return { ok: false, error: 'Please enter a valid phone number.' };
  const pw = passwordError(data.password);
  if (pw) return { ok: false, error: pw };

  const supabase = await createClient({ remember: true });
  const { data: res, error } = await supabase.auth.signUp({
    email,
    password: data.password,
    options: {
      data: { full_name: fullName, phone },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent('/account?welcome=1')}`,
    },
  });
  if (error) {
    const exists = error.code === 'user_already_exists' || error.code === 'email_exists';
    return { ok: false, exists, error: authErrorMessage(error, 'Registration failed.') };
  }
  // With email confirmation on, Supabase hides existing accounts by returning a user with no identities.
  if (res.user && res.user.identities?.length === 0) {
    return { ok: false, exists: true, error: authErrorMessage({ code: 'user_already_exists' }) };
  }
  return { ok: true, needsConfirmation: !res.session };
}

export async function signOut(): Promise<void> {
  if (!authReady()) return;
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(REMEMBER_COOKIE);
}

/** Always succeeds, so the form can't be used to find out who has an account. */
export async function requestPasswordReset(email: string): Promise<Result> {
  if (!authReady()) return NOT_CONFIGURED;
  if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error?.code === 'over_email_send_rate_limit' || error?.code === 'over_request_rate_limit') {
    return { ok: false, error: authErrorMessage(error) };
  }
  return { ok: true };
}

/** Sets a new password for someone who arrived from a reset link (they hold a recovery session). */
export async function setNewPassword(password: string): Promise<Result> {
  if (!authReady()) return NOT_CONFIGURED;
  const pw = passwordError(password);
  if (pw) return { ok: false, error: pw };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { ok: false, error: 'This reset link is invalid or has expired. Please request a new one.' };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: authErrorMessage(error, 'We could not update your password.') };
  await db.update(profiles).set({ pendingSetup: false }).where(eq(profiles.id, data.user.id));
  return { ok: true };
}

export async function updateProfile(data: {
  fullName: string;
  email: string;
  phone: string;
}): Promise<Result & { emailPending?: boolean }> {
  const user = await getCustomer();
  if (!user) return { ok: false, error: 'You are not signed in.' };
  const fullName = data.fullName.trim();
  const email = data.email.trim();
  const phone = data.phone.trim();
  if (fullName.length < 2) return { ok: false, error: 'Please enter your full name.' };
  if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!isValidPhone(phone)) return { ok: false, error: 'Please enter a valid phone number.' };

  await db.update(profiles).set({ fullName, phone, updatedAt: new Date() }).where(eq(profiles.id, user.id));

  if (email.toLowerCase() === user.email.toLowerCase()) return { ok: true };
  // The email changes once the customer confirms it from their inbox (the auth trigger then updates the profile).
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/account/profile` },
  );
  if (error) return { ok: false, error: authErrorMessage(error, 'Your details were saved, but not the new email.') };
  return { ok: true, emailPending: true };
}

export async function changePassword(current: string, next: string): Promise<Result> {
  const user = await getCustomer();
  if (!user) return { ok: false, error: 'You are not signed in.' };
  const pw = passwordError(next);
  if (pw) return { ok: false, error: pw };
  if (!(await passwordMatches(user.email, current))) return { ok: false, error: 'Your current password is incorrect.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, error: authErrorMessage(error, 'Could not update password.') };
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Addresses                                                           */
/* ------------------------------------------------------------------ */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v?: string) => v?.trim() || null;

/** Creates or updates an address on the signed-in account. Returns the saved address id. */
export async function saveAddress(address: Address): Promise<Result & { id?: string }> {
  const authUser = await getCustomer();
  if (!authUser) return { ok: false, error: 'You are not signed in.' };
  if (!address.state?.trim() || !address.city?.trim() || !address.street?.trim()) {
    return { ok: false, error: 'Please fill in the state, city and street.' };
  }
  const values = {
    label: clean(address.label),
    country: address.country?.trim() || 'Nigeria',
    state: address.state.trim(),
    city: address.city.trim(),
    street: address.street.trim(),
    houseNumber: clean(address.houseNumber),
    landmark: clean(address.landmark),
    instructions: clean(address.instructions),
  };

  return db.transaction(async (tx) => {
    const existing = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, authUser.id));
    const isUpdate = UUID.test(address.id) && existing.some((a) => a.id === address.id);
    const makeDefault = !!address.isDefault || existing.length === 0 || (isUpdate && existing.length === 1);
    if (makeDefault) {
      await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, authUser.id));
    }
    if (isUpdate) {
      await tx
        .update(addresses)
        .set({ ...values, ...(makeDefault ? { isDefault: true } : {}), updatedAt: new Date() })
        .where(and(eq(addresses.id, address.id), eq(addresses.userId, authUser.id)));
      return { ok: true, id: address.id };
    }
    const [row] = await tx
      .insert(addresses)
      .values({ ...values, userId: authUser.id, isDefault: makeDefault })
      .returning({ id: addresses.id });
    return { ok: true, id: row.id };
  });
}

export async function deleteAddress(id: string): Promise<Result> {
  const authUser = await getCustomer();
  if (!authUser) return { ok: false, error: 'You are not signed in.' };
  if (!UUID.test(id)) return { ok: false, error: 'Address not found.' };
  await db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, authUser.id)))
      .returning({ isDefault: addresses.isDefault });
    if (!removed?.isDefault) return;
    // Promote the oldest remaining address.
    const [next] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, authUser.id))
      .orderBy(addresses.createdAt)
      .limit(1);
    if (next) await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
  });
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<Result> {
  const authUser = await getCustomer();
  if (!authUser) return { ok: false, error: 'You are not signed in.' };
  if (!UUID.test(id)) return { ok: false, error: 'Address not found.' };
  await db.transaction(async (tx) => {
    await tx
      .update(addresses)
      .set({ isDefault: false })
      .where(and(eq(addresses.userId, authUser.id), ne(addresses.id, id)));
    await tx
      .update(addresses)
      .set({ isDefault: true })
      .where(and(eq(addresses.id, id), eq(addresses.userId, authUser.id)));
  });
  return { ok: true };
}
