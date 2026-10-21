import React from 'react';
import { render } from '@react-email/render';
import { EmailLayout, type EmailBrand, type EmailContent } from '@/lib/email/layout';

/**
 * Supabase Auth's own emails (confirm sign-up, reset password, change email) in the same layout as every other
 * email. Supabase fills them in itself, so they use its template tags: `{{ .SiteURL }}` is the Site URL set under
 * Authentication → URL Configuration, `{{ .TokenHash }}` the one-time link. The links go to /auth/callback with
 * `token_hash`, which works on any device (the default link only works in the browser that asked for it).
 * Written to supabase/templates by `pnpm auth:email-templates`.
 */

const SITE = '{{ .SiteURL }}';
const link = (type: string, next: string) =>
  `${SITE}/auth/callback?token_hash={{ .TokenHash }}&type=${type}&next=${encodeURIComponent(next)}`;

export const AUTH_EMAILS: Record<
  'confirmation' | 'recovery' | 'email_change',
  { subject: string; content: EmailContent }
> = {
  confirmation: {
    subject: 'Confirm your LUXICHIC account',
    content: {
      preview: 'One tap to finish creating your account.',
      body: 'Welcome to LUXICHIC!\n\nPlease confirm your email address to finish creating your account. Orders and appointments you made as a guest with this email will appear in your account.',
      button: { label: 'Confirm my email', href: link('email', '/account?welcome=1') },
      note: 'This link works once and expires in 1 hour. If you didn’t create an account, you can ignore this email.',
    },
  },
  recovery: {
    subject: 'Reset your LUXICHIC password',
    content: {
      preview: 'Choose a new password for your account.',
      body: 'We received a request to reset the password for your LUXICHIC account.\n\nTap the button below to choose a new one.',
      button: { label: 'Choose a new password', href: link('recovery', '/reset-password') },
      note: 'This link works once and expires in 1 hour. If you didn’t ask for this, you can ignore this email; your password stays the same.',
    },
  },
  email_change: {
    subject: 'Confirm your new email address',
    content: {
      preview: 'Confirm the change to your account’s email.',
      body: 'We received a request to change the email on your LUXICHIC account from {{ .Email }} to {{ .NewEmail }}.\n\nConfirm the change with the button below. For your security, both addresses get this email and both must confirm.',
      button: { label: 'Confirm the change', href: link('email_change', '/account/profile') },
      note: 'This link works once and expires in 1 hour. If you didn’t ask for this, ignore this email and your email stays the same.',
    },
  },
};

/** The three emails as HTML, with the footer's contact details from the store's settings. */
export async function renderAuthEmails(contact: Omit<EmailBrand, 'siteUrl'>) {
  const brand: EmailBrand = { ...contact, siteUrl: SITE };
  const out: Record<string, { subject: string; html: string }> = {};
  for (const [key, { subject, content }] of Object.entries(AUTH_EMAILS)) {
    out[key] = { subject, html: await render(<EmailLayout content={content} brand={brand} />) };
  }
  return out;
}
