import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { checkVerifyToken, linkGuestRecords } from '@/lib/auth/guest-records';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * The link in the "Confirm your email" message. Signed in as the account it was sent to, it marks the email as
 * confirmed and moves that email's earlier guest orders and appointments (with their addresses) into the
 * account. Signed out, it asks them to sign in first and comes back here.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const back = `/auth/verify-email?token=${encodeURIComponent(token)}`;
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(back)}`, url.origin));
  }
  const email = checkVerifyToken(token, user.id);
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, user.id));
  if (!email || !profile || email !== user.email?.toLowerCase()) {
    return NextResponse.redirect(new URL('/account?confirm=invalid', url.origin));
  }
  const auth = createAdminClient().auth.admin;
  const { data } = await auth.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, verified_email: email },
  });
  const linked = data.user ? await linkGuestRecords(data.user) : { orders: 0, appointments: 0 };
  return NextResponse.redirect(
    new URL(`/account?confirmed=1&orders=${linked.orders}&appointments=${linked.appointments}`, url.origin),
  );
}
