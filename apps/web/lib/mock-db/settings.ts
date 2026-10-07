import type { ActivitySection, AdminUser, EmailTemplate, MediaItem, SiteContent, StoreSettings } from '@/types/admin';
import { logActivity, updateDb } from '@/lib/mock-db/db';
import { generateId } from '@/lib/utils/references';

/**
 * Settings & content service. Sensitive values (SMTP password, WhatsApp API key)
 * are never stored here — only a "set" flag. Send them straight to the backend.
 */

export function updateSettings<K extends keyof StoreSettings>(
  actor: AdminUser,
  key: K,
  value: StoreSettings[K],
  section: ActivitySection,
  action: string,
  target?: string,
) {
  updateDb((d) => {
    d.settings[key] = value;
    logActivity(d, actor, section, action, target);
  });
}

export function updateContent<K extends keyof SiteContent>(
  actor: AdminUser,
  key: K,
  value: SiteContent[K],
  action: string,
) {
  updateDb((d) => {
    d.content[key] = value;
    logActivity(d, actor, 'Content', action, String(key));
  });
}

export function saveEmailTemplate(actor: AdminUser, t: EmailTemplate) {
  updateDb((d) => {
    d.emailTemplates = d.emailTemplates.map((x) => (x.id === t.id ? t : x));
    logActivity(d, actor, 'Email', 'Edited email template', t.name);
  });
}

export function addMedia(actor: AdminUser, item: Omit<MediaItem, 'id' | 'uploadedAt'>) {
  updateDb((d) => {
    d.media = [{ ...item, id: generateId('m'), uploadedAt: new Date().toISOString() }, ...d.media];
    logActivity(d, actor, 'Content', 'Uploaded media', item.name);
  });
}

export function deleteMedia(actor: AdminUser, id: string) {
  updateDb((d) => {
    const m = d.media.find((x) => x.id === id);
    d.media = d.media.filter((x) => x.id !== id);
    logActivity(d, actor, 'Content', 'Deleted media', m?.name);
  });
}

export function markNotifications(ids: string[] | 'all', read = true) {
  updateDb((d) => {
    d.notifications.forEach((n) => {
      if (ids === 'all' || ids.includes(n.id)) n.read = read;
    });
  });
}

export function addNote(actor: AdminUser, scope: 'orderNotes' | 'customerNotes', key: string, text: string) {
  updateDb((d) => {
    const list = d[scope][key] ?? [];
    d[scope][key] = [{ id: generateId('note'), text, by: actor.fullName, at: new Date().toISOString() }, ...list];
    logActivity(d, actor, scope === 'orderNotes' ? 'Orders' : 'Customers', 'Added internal note', key);
  });
}
