import type { User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/lib/env', () => ({ env: { SUPABASE_SECRET_KEY: 'test-secret-key' } }));
const { checkVerifyToken, hasVerifiedEmail, verifyToken } = await import('@/lib/auth/guest-records');

const user = (over: Partial<User>) =>
  ({ id: 'u1', email: 'ada@example.com', app_metadata: {}, identities: [], ...over }) as User;

describe('who may see earlier guest orders', () => {
  it('not a plain email + password sign-up (anyone could use someone else’s email)', () => {
    expect(hasVerifiedEmail(user({ email_confirmed_at: '2026-10-20T10:00:00Z' }))).toBe(false);
  });

  it('a confirmed email, a Google sign-in for that address, or our confirmation link', () => {
    expect(
      hasVerifiedEmail(
        user({ confirmation_sent_at: '2026-10-20T09:00:00Z', email_confirmed_at: '2026-10-20T10:00:00Z' }),
      ),
    ).toBe(true);
    const google = { provider: 'google', identity_data: { email: 'ADA@example.com', email_verified: true } };
    expect(hasVerifiedEmail(user({ identities: [google] as unknown as User['identities'] }))).toBe(true);
    expect(hasVerifiedEmail(user({ app_metadata: { verified_email: 'ada@example.com' } }))).toBe(true);
  });

  it('not when the confirmed address isn’t the account’s current email', () => {
    expect(hasVerifiedEmail(user({ app_metadata: { verified_email: 'old@example.com' } }))).toBe(false);
    const google = { provider: 'google', identity_data: { email: 'other@example.com', email_verified: true } };
    expect(hasVerifiedEmail(user({ identities: [google] as unknown as User['identities'] }))).toBe(false);
  });
});

describe('the confirmation link', () => {
  it('works for the account it was sent to', () => {
    expect(checkVerifyToken(verifyToken('u1', 'Ada@Example.com'), 'u1')).toBe('ada@example.com');
  });

  it('is refused for another account, when changed, or garbled', () => {
    const token = verifyToken('u1', 'ada@example.com');
    expect(checkVerifyToken(token, 'u2')).toBeNull();
    expect(checkVerifyToken(token.slice(0, -2) + 'xx', 'u1')).toBeNull();
    expect(checkVerifyToken('not-a-token', 'u1')).toBeNull();
    // Someone editing the payload (e.g. their own id) breaks the signature.
    const [, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ u: 'u2', e: 'ada@example.com', x: Date.now() + 1e9 })).toString(
      'base64url',
    );
    expect(checkVerifyToken(`${forged}.${sig}`, 'u2')).toBeNull();
  });

  it('expires after 3 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T10:00:00Z'));
    const token = verifyToken('u1', 'ada@example.com');
    vi.setSystemTime(new Date('2026-10-23T09:59:00Z'));
    expect(checkVerifyToken(token, 'u1')).toBe('ada@example.com');
    vi.setSystemTime(new Date('2026-10-23T10:01:00Z'));
    expect(checkVerifyToken(token, 'u1')).toBeNull();
    vi.useRealTimers();
  });
});
