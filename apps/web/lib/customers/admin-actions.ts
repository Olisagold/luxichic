'use server';

import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { ActionError, adminAction, audit } from '@/lib/auth/admin-action';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUuid, isValidEmail, isValidPhone } from '@/lib/utils/validation';
import type { Result } from '@/types/user';

/**
 * Admin actions on customer accounts. Each checks its permission on the server and writes to `audit_logs`.
 * Logins live in Supabase Auth; the database triggers keep `profiles` in step (new account, email change).
 */

const link = (id: string) => `/admin/customers/${id}`;

async function customer(id: string) {
  if (!isUuid(id)) throw new ActionError('Customer not found.');
  const [row] = await db.select().from(s.profiles).where(eq(s.profiles.id, id));
  if (!row) throw new ActionError('Customer not found.');
  return row;
}

/** Blocked customers can't sign in, order or book (checked at each of those). */
export async function setCustomerBlocked(id: string, blocked: boolean): Promise<Result> {
  return adminAction('customers.block', async (admin) => {
    const c = await customer(id);
    await db.transaction(async (tx) => {
      await tx
        .update(s.profiles)
        .set({ status: blocked ? 'blocked' : 'active', updatedAt: new Date() })
        .where(eq(s.profiles.id, c.id));
      await audit(tx, admin, {
        section: 'Customers',
        action: blocked ? 'Blocked customer' : 'Unblocked customer',
        target: c.email,
        link: link(c.id),
      });
    });
    return { ok: true };
  });
}

/** Name, phone and email. A new email becomes the customer's login straight away. */
export async function updateCustomer(
  id: string,
  data: { fullName: string; email: string; phone: string },
): Promise<Result> {
  return adminAction('customers.edit', async (admin) => {
    const c = await customer(id);
    const fullName = String(data?.fullName ?? '').trim();
    const email = String(data?.email ?? '').trim();
    const phone = String(data?.phone ?? '').trim();
    if (fullName.length < 2) throw new ActionError('Enter the customer’s name.');
    if (!isValidEmail(email)) throw new ActionError('Enter a valid email address.');
    if (phone && !isValidPhone(phone)) throw new ActionError('Enter a valid phone number.');

    if (email.toLowerCase() !== c.email.toLowerCase()) {
      // Changes the login; the email-change trigger copies it to the profile.
      const { error } = await createAdminClient().auth.admin.updateUserById(c.id, { email, email_confirm: true });
      if (error) {
        throw new ActionError(
          /already|exists|registered/i.test(error.message)
            ? 'Another account already uses this email.'
            : 'Could not change the email.',
        );
      }
    }
    await db.transaction(async (tx) => {
      await tx
        .update(s.profiles)
        .set({ fullName, phone: phone || null, updatedAt: new Date() })
        .where(eq(s.profiles.id, c.id));
      await audit(tx, admin, { section: 'Customers', action: 'Edited customer', target: email, link: link(c.id) });
    });
    return { ok: true };
  });
}

/**
 * Creates a customer account without a password; the customer sets one with "Forgot password" on the sign-in
 * page. (Invitation emails come with the Resend email setup in Phase 11.)
 */
export async function createCustomer(data: {
  fullName: string;
  email: string;
  phone: string;
  status: 'active' | 'blocked';
}): Promise<Result & { id?: string }> {
  return adminAction('customers.edit', async (admin) => {
    const fullName = String(data?.fullName ?? '').trim();
    const email = String(data?.email ?? '').trim();
    const phone = String(data?.phone ?? '').trim();
    if (fullName.length < 2) throw new ActionError('Enter the customer’s name.');
    if (!isValidEmail(email)) throw new ActionError('Enter a valid email address.');
    if (phone && !isValidPhone(phone)) throw new ActionError('Enter a valid phone number.');
    const [taken] = await db
      .select({ id: s.profiles.id })
      .from(s.profiles)
      .where(sql`lower(${s.profiles.email}) = lower(${email})`);
    if (taken) throw new ActionError('A customer with this email already exists.');

    const { data: created, error } = await createAdminClient().auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });
    if (error || !created.user) {
      throw new ActionError(
        /already|exists|registered/i.test(error?.message ?? '')
          ? 'An account with this email already exists.'
          : 'Could not create the account.',
      );
    }
    const id = created.user.id;
    await db.transaction(async (tx) => {
      // The sign-up trigger made the profile; mark it as waiting for the customer to set a password.
      await tx
        .update(s.profiles)
        .set({ status: data.status === 'blocked' ? 'blocked' : 'active', pendingSetup: true, updatedAt: new Date() })
        .where(eq(s.profiles.id, id));
      await audit(tx, admin, { section: 'Customers', action: 'Created customer', target: email, link: link(id) });
    });
    return { ok: true, id };
  });
}

/** Deletes the login and saved addresses. Their orders, bookings and reviews stay, without the account link. */
export async function deleteCustomer(id: string): Promise<Result> {
  return adminAction('customers.delete', async (admin) => {
    const c = await customer(id);
    // The profile (and addresses, cart, wishlist) go with the login; orders and reviews keep their copies.
    const { error } = await createAdminClient().auth.admin.deleteUser(c.id);
    if (error) throw new ActionError('Could not delete the account.');
    await db
      .delete(s.adminNotes)
      .where(sql`${s.adminNotes.subject} = 'customer' and ${s.adminNotes.subjectId} = ${c.id}`);
    await audit(db, admin, { section: 'Customers', action: 'Deleted customer', target: c.email });
    return { ok: true };
  });
}

/** An internal note about a registered customer, only visible to admins. */
export async function addCustomerNote(id: string, text: string): Promise<Result> {
  return adminAction('customers.view', async (admin) => {
    const c = await customer(id);
    const body = String(text ?? '')
      .trim()
      .slice(0, 2000);
    if (!body) throw new ActionError('Write a note first.');
    await db.transaction(async (tx) => {
      await tx.insert(s.adminNotes).values({ subject: 'customer', subjectId: c.id, body, adminId: admin.id });
      await audit(tx, admin, { section: 'Customers', action: 'Added a note', target: c.email, link: link(c.id) });
    });
    return { ok: true };
  });
}
