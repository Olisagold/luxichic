import { describe, expect, it } from 'vitest';
import { canonicalRedirect } from './canonical-host';

const SITE = 'https://luxichic.online';
const go = (href: string, method = 'GET', env: string | undefined = 'production') =>
  canonicalRedirect(new URL(href), method, SITE, env)?.toString() ?? null;

describe('canonicalRedirect', () => {
  it('moves page visits on the vercel.app address to the domain, keeping path and query', () => {
    expect(go('https://luxichic.vercel.app/hairs/shop/all?sort=new')).toBe(`${SITE}/hairs/shop/all?sort=new`);
    expect(go('https://luxichic.vercel.app/', 'HEAD')).toBe(`${SITE}/`);
  });

  it('leaves the domain itself, previews, local dev, API routes and form posts alone', () => {
    expect(go(`${SITE}/hairs`)).toBeNull();
    expect(go('https://luxichic-git-feature-olisagold.vercel.app/', 'GET', 'preview')).toBeNull();
    expect(go('http://localhost:3000/', 'GET', undefined)).toBeNull();
    expect(go('https://luxichic.vercel.app/api/webhooks/telegram')).toBeNull();
    expect(go('https://luxichic.vercel.app/api/cron/reminders')).toBeNull();
    expect(go('https://luxichic.vercel.app/checkout', 'POST')).toBeNull();
  });
});
