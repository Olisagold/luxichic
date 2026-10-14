import type { Metadata } from 'next';
import { desc, isNull } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { Newsletter } from '@/views/admin/customers/Newsletter';

export const metadata: Metadata = { title: 'Newsletter — Admin' };

export default async function AdminNewsletterPage() {
  const admin = await getAdmin();
  const allowed = !!admin && hasPermission(admin, 'customers.view');
  const rows = allowed
    ? await db
        .select()
        .from(s.newsletterSubscribers)
        .where(isNull(s.newsletterSubscribers.unsubscribedAt))
        .orderBy(desc(s.newsletterSubscribers.subscribedAt))
    : [];
  return (
    <RequirePermission permission="customers.view">
      <Newsletter
        subscribers={rows.map((r) => ({
          id: r.id,
          email: r.email,
          source: r.source,
          subscribedAt: r.subscribedAt.toISOString(),
        }))}
      />
    </RequirePermission>
  );
}
