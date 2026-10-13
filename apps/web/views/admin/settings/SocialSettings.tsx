'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
  Trash2Icon,
} from 'lucide-react';
import type { SocialDivision, SocialLink, SocialPlatform } from '@/types/admin';
import { useAdminSettings } from '@/components/admin/AdminSettingsProvider';
import { saveSocialLinks } from '@/lib/settings/admin-actions';
import { socialDivisions, socialPlatforms } from '@/data/socialLinks';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminSelect } from '@/components/admin/ui/AdminField';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { Toggle } from '@/components/admin/ui/Toggle';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { SaveBar } from '@/components/admin/content/SaveBar';
import { Modal } from '@/components/ui/Modal';
import { SocialIcon, socialHref } from '@/components/ui/SocialIcon';
import { generateId } from '@/lib/utils/references';
import { cn } from '@/lib/utils/cn';

interface FormState {
  links: SocialLink[];
  chatNumber: string;
}

export function SocialSettings() {
  const router = useRouter();
  const { settings: s } = useAdminSettings();
  const initial: FormState = { links: s.socialLinks ?? [], chatNumber: s.business.whatsapp };
  const [form, setForm] = useState<FormState>(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [removing, setRemoving] = useState<SocialLink | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== baseline;
  const { links } = form;

  const setLinks = (next: SocialLink[]) => setForm((f) => ({ ...f, links: next }));
  const patch = (id: string, p: Partial<SocialLink>) => setLinks(links.map((l) => (l.id === id ? { ...l, ...p } : l)));

  /** Swap with the neighbouring link in the same division. */
  const move = (link: SocialLink, dir: -1 | 1) => {
    const group = links.filter((l) => l.division === link.division);
    const i = group.findIndex((l) => l.id === link.id);
    const other = group[i + dir];
    if (!other) return;
    const a = links.indexOf(link);
    const b = links.indexOf(other);
    const next = links.slice();
    [next[a], next[b]] = [next[b], next[a]];
    setLinks(next);
  };

  const save = async () => {
    if (form.chatNumber && !/^\d{10,15}$/.test(form.chatNumber))
      return toast.error('Floating chat number: use international format digits, e.g. 2348012345678.');
    setSaving(true);
    const res = await saveSocialLinks(links, form.chatNumber).catch(() => null);
    setSaving(false);
    if (!res?.ok) return toast.error(res?.error ?? 'Could not save the social links.');
    setBaseline(JSON.stringify(form));
    router.refresh();
    toast.success('Social links published', { description: 'The footer updates right away.' });
  };

  const upsert = (link: SocialLink) => {
    setLinks(links.some((l) => l.id === link.id) ? links.map((l) => (l.id === link.id ? link : l)) : [...links, link]);
    setEditing(null);
  };

  const blank = (division: SocialDivision = 'hairs'): SocialLink => ({
    id: '',
    platform: 'instagram',
    division,
    handle: '',
    url: '',
    enabled: true,
  });

  return (
    <div className="pb-20">
      <PageHeader
        title="Social media"
        description="Add any number of social accounts for each division. Each one shows as an icon in the website footer, grouped by division."
        actions={
          <AdminButton variant="primary" icon={<PlusIcon className="h-4 w-4" />} onClick={() => setEditing(blank())}>
            Add social link
          </AdminButton>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {socialDivisions.map((d) => {
            const group = links.filter((l) => l.division === d.key);
            return (
              <section key={d.key} aria-labelledby={`soc-${d.key}`} className="rounded-xl border border-line bg-white">
                <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
                  <h2 id={`soc-${d.key}`} className="text-[13px] font-semibold text-ink">
                    {d.label}{' '}
                    <span className="ml-1 font-normal text-subtle">
                      {group.filter((l) => l.enabled).length} visible
                    </span>
                  </h2>
                  <AdminButton
                    size="xs"
                    icon={<PlusIcon className="h-3 w-3" />}
                    onClick={() => setEditing(blank(d.key))}
                  >
                    Add
                  </AdminButton>
                </header>
                {group.length === 0 ? (
                  <p className="px-4 py-4 text-[13px] text-subtle">
                    No links yet. Nothing shows in the footer for this division.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {group.map((l, i) => (
                      <li key={l.id} className={cn('flex items-center gap-3 px-4 py-2.5', !l.enabled && 'opacity-60')}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                          <SocialIcon platform={l.platform} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-ink">
                            {socialPlatforms[l.platform].label}
                            {l.handle && <span className="ml-1.5 font-normal text-charcoal">{l.handle}</span>}
                          </p>
                          <p className="truncate text-xs text-subtle">
                            {l.platform === 'whatsapp' ? `+${l.url}` : l.url || 'No link set'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <button
                            onClick={() => move(l, -1)}
                            disabled={i === 0}
                            className="rounded-md p-1 text-subtle hover:bg-canvas disabled:opacity-30"
                            aria-label="Move left in footer"
                          >
                            <ChevronUpIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => move(l, 1)}
                            disabled={i === group.length - 1}
                            className="rounded-md p-1 text-subtle hover:bg-canvas disabled:opacity-30"
                            aria-label="Move right in footer"
                          >
                            <ChevronDownIcon className="h-4 w-4" />
                          </button>
                          <a
                            href={l.url ? socialHref(l) : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md p-1.5 text-subtle hover:bg-canvas hover:text-ink"
                            aria-label="Open link"
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => setEditing(l)}
                            className="rounded-md p-1.5 text-subtle hover:bg-canvas hover:text-ink"
                            aria-label={`Edit ${socialPlatforms[l.platform].label}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setRemoving(l)}
                            className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-700"
                            aria-label={`Remove ${socialPlatforms[l.platform].label}`}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </button>
                          <span className="ml-2">
                            <Toggle
                              srOnlyLabel
                              label={`Show ${socialPlatforms[l.platform].label} in footer`}
                              checked={l.enabled}
                              onChange={(v) => patch(l.id, { enabled: v })}
                            />
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          {links.length === 0 && (
            <div className="rounded-xl border border-line bg-white">
              <AdminEmpty
                icon={<Share2Icon className="h-5 w-5" />}
                title="No social links"
                text="The footer won’t show any social icons."
              />
            </div>
          )}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <section className="overflow-hidden rounded-xl border border-line bg-white" aria-label="Footer preview">
            <p className="border-b border-line px-4 py-2.5 text-xs font-semibold text-subtle">Footer preview</p>
            <div className="space-y-4 bg-ink p-4">
              {socialDivisions.map((d) => {
                const shown = links.filter((l) => l.division === d.key && l.enabled && l.url);
                if (!shown.length) return null;
                return (
                  <div key={d.key}>
                    <p className="text-[11px] font-semibold text-white/60">
                      {d.key === 'main' ? 'Follow LUXICHIC' : d.label}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {shown.map((l) => (
                        <span
                          key={l.id}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white"
                        >
                          <SocialIcon platform={l.platform} className="h-3.5 w-3.5" />
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="rounded-xl border border-line bg-white p-4">
            <AdminInput
              id="chat-num"
              label="Floating chat button number"
              inputMode="numeric"
              value={form.chatNumber}
              placeholder="2348012345678"
              hint="The green WhatsApp button on every page."
              onChange={(e) => setForm({ ...form, chatNumber: e.target.value.replace(/\D/g, '') })}
            />
          </section>
        </aside>
      </div>

      <SocialLinkDialog
        key={editing?.id || (editing ? `new-${editing.division}` : 'closed')}
        link={editing}
        onClose={() => setEditing(null)}
        onSave={upsert}
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) setLinks(links.filter((l) => l.id !== removing.id));
          setRemoving(null);
        }}
        title={`Remove this ${removing ? socialPlatforms[removing.platform].label : ''} link?`}
        tone="danger"
        confirmLabel="Remove"
        message="It disappears from the footer after you publish. Switch it off instead if you may need it again."
      />

      <SaveBar dirty={dirty} saving={saving} onSave={save} onReset={() => setForm(JSON.parse(baseline))} />
    </div>
  );
}

function SocialLinkDialog({
  link,
  onClose,
  onSave,
}: {
  link: SocialLink | null;
  onClose: () => void;
  onSave: (l: SocialLink) => void;
}) {
  const [l, setL] = useState<SocialLink>(
    link ?? { id: '', platform: 'instagram', division: 'hairs', handle: '', url: '', enabled: true },
  );
  const [error, setError] = useState('');
  const meta = socialPlatforms[l.platform];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = l.platform === 'whatsapp' ? l.url.replace(/\D/g, '') : l.url.trim();
    if (!url) return setError(`Enter the ${meta.urlLabel.toLowerCase()}.`);
    if (meta.pattern && !meta.pattern.test(url))
      return setError(
        l.platform === 'whatsapp'
          ? 'Use international format digits, e.g. 2348012345678.'
          : `Enter a full ${meta.label} link starting with https://`,
      );
    const handle = l.handle.trim();
    onSave({
      ...l,
      url,
      handle:
        handle && ['instagram', 'tiktok', 'x', 'snapchat'].includes(l.platform) && !handle.startsWith('@')
          ? `@${handle}`
          : handle,
      id: l.id || generateId('soc'),
    });
  };

  return (
    <Modal
      open={!!link}
      onClose={onClose}
      title={link?.id ? 'Edit social link' : 'Add social link'}
      className="max-w-lg rounded-2xl"
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-charcoal">Platform</legend>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(socialPlatforms) as SocialPlatform[]).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={l.platform === p}
                onClick={() => {
                  setL({ ...l, platform: p });
                  setError('');
                }}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-semibold',
                  l.platform === p ? 'border-ink bg-ink text-white' : 'border-line text-charcoal hover:border-ink/40',
                )}
              >
                <SocialIcon platform={p} className="h-4 w-4" />
                <span className="truncate">{socialPlatforms[p].label.replace(' (Twitter)', '')}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <AdminSelect
          id="sl-div"
          label="Division"
          value={l.division}
          onChange={(e) => setL({ ...l, division: e.target.value as SocialDivision })}
          options={socialDivisions.map((d) => ({ value: d.key, label: d.label }))}
        />
        <AdminInput
          id="sl-url"
          label={meta.urlLabel}
          inputMode={l.platform === 'whatsapp' ? 'numeric' : 'url'}
          value={l.url}
          placeholder={meta.placeholder}
          error={error}
          onChange={(e) => {
            setL({ ...l, url: e.target.value });
            setError('');
          }}
        />

        <AdminInput
          id="sl-handle"
          label={l.platform === 'whatsapp' || l.platform === 'website' ? 'Label' : 'Handle'}
          optional
          value={l.handle}
          placeholder={
            l.platform === 'whatsapp' ? 'e.g. Salon bookings' : l.platform === 'website' ? 'e.g. Blog' : '@luxichic'
          }
          hint="Shown when customers hover the icon and read by screen readers."
          onChange={(e) => setL({ ...l, handle: e.target.value })}
        />

        <Toggle label="Show in footer" checked={l.enabled} onChange={(v) => setL({ ...l, enabled: v })} />
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary">
            {link?.id ? 'Update link' : 'Add link'}
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}
