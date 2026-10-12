import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { SiteContent } from '@/types/admin';
import { useAdminContent } from '@/components/admin/AdminContentProvider';
import { saveContent } from '@/lib/content/admin-actions';

/**
 * Editable copy of some parts of the website content (loaded on the server by the page), with unsaved-change
 * tracking. `save` sends only the parts that changed to the server and reloads the page's data.
 */
export function useContentDraft<K extends keyof SiteContent>(keys: K[]) {
  const { content } = useAdminContent();
  const router = useRouter();
  const pick = () =>
    JSON.parse(JSON.stringify(Object.fromEntries(keys.map((k) => [k, content[k]])))) as Pick<SiteContent, K>;
  const [draft, setDraft] = useState<Pick<SiteContent, K>>(pick);
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <T extends K>(key: T, value: SiteContent[T]) => setDraft((d) => ({ ...d, [key]: value }));
  const reset = () => setDraft(JSON.parse(baseline));

  /** Saves the changed parts (with `override` applied first). Resolves to true when saved. */
  const save = async (override: Partial<Pick<SiteContent, K>> = {}): Promise<boolean> => {
    const next = { ...draft, ...override };
    const base = JSON.parse(baseline) as Pick<SiteContent, K>;
    const changed = keys.filter((k) => JSON.stringify(base[k]) !== JSON.stringify(next[k]));
    setSaving(true);
    const res = await saveContent(Object.fromEntries(changed.map((k) => [k, next[k]]))).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      toast.error(res?.error ?? 'Could not save. Please try again.');
      return false;
    }
    setDraft(next);
    setBaseline(JSON.stringify(next));
    router.refresh();
    return true;
  };

  return { draft, set, dirty, reset, save, saving };
}
