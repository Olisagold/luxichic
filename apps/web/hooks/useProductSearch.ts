import { useEffect, useState } from 'react';

type Scope = 'all' | 'hairs' | 'tools';

/**
 * Ids of the products matching `query`, best match first, from /api/search (Postgres full-text search).
 * Asks once typing pauses; a newer query cancels the older request. `null` until the first answer, and while
 * fewer than `minLength` characters are typed. Until a new answer arrives the previous one is kept, so
 * results don't flash empty between keystrokes.
 */
export function useProductSearch(query: string, scope: Scope, { limit = 200, minLength = 1 } = {}) {
  const [answer, setAnswer] = useState<{ key: string; ids: string[] } | null>(null);
  const term = query.trim();
  const active = term.length >= minLength;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const key = `${scope}:${term}`;
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: term, scope, limit: String(limit) });
        const res = await fetch(`/api/search?${params}`, { signal: controller.signal });
        if (res.ok) setAnswer({ key, ids: ((await res.json()) as { ids: string[] }).ids });
      } catch {
        // Cancelled or offline: keep the last answer.
      }
    }, 150);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [term, scope, limit, active]);

  return active ? (answer?.ids ?? null) : null;
}
