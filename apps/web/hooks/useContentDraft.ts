import { useEffect, useState } from 'react';
import type { SiteContent } from '@/types/admin';
import { getDb } from '@/lib/mock-db/db';

/** Local editable copy of selected content keys with dirty tracking. */
export function useContentDraft<K extends keyof SiteContent>(keys: K[]) {
  const pick = () => {
    const c = getDb().content;
    return JSON.parse(JSON.stringify(Object.fromEntries(keys.map((k) => [k, c[k]])))) as Pick<SiteContent, K>;
  };
  const [draft, setDraft] = useState<Pick<SiteContent, K>>(pick);
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const dirty = JSON.stringify(draft) !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {e.preventDefault();e.returnValue = '';};
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <T extends K,>(key: T, value: SiteContent[T]) => setDraft((d) => ({ ...d, [key]: value }));
  const markSaved = (saved?: Pick<SiteContent, K>) => setBaseline(JSON.stringify(saved ?? draft));
  const reset = () => setDraft(JSON.parse(baseline));
  const changedKeys = () => {
    const base = JSON.parse(baseline) as Pick<SiteContent, K>;
    return keys.filter((k) => JSON.stringify(base[k]) !== JSON.stringify(draft[k]));
  };

  return { draft, set, dirty, markSaved, reset, changedKeys };
}