'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { PlusIcon, ScissorsIcon, XIcon } from 'lucide-react';
import type { AdminService } from '@/types/admin';
import { useAdminSalon } from '@/components/admin/AdminSalonProvider';
import { assignSpecialist, deleteService, saveService, setServiceStatus } from '@/lib/salon/admin-actions';
import { uploadAdminImage } from '@/lib/media/upload-client';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { AdminInput, AdminSelect, AdminTextarea } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { slugify } from '@/lib/utils/text';
import { SaveBar } from '@/components/admin/content/SaveBar';

const blank = (whatsapp: string): AdminService => ({
  slug: '',
  name: '',
  category: 'Beauty',
  shortDescription: '',
  description: '',
  includes: [],
  startingPrice: null,
  duration: null,
  image: '',
  personnel: [],
  whatsapp,
  status: 'draft',
  durationMinutes: 60,
  bookable: true,
});

export function ServiceEditor() {
  const { slug } = useParams<{ slug: string }>();
  const isNew = !slug || slug === 'new';
  const { services, whatsapp } = useAdminSalon();
  const existing = isNew ? undefined : services.find((s) => s.slug === slug);
  if (!isNew && !existing) {
    return (
      <div className="rounded-xl border border-line bg-white">
        <AdminEmpty
          icon={<ScissorsIcon className="h-5 w-5" />}
          title="Service not found"
          action={<AdminButton to="/admin/salon/services">Back to services</AdminButton>}
        />
      </div>
    );
  }
  return <Editor key={slug ?? 'new'} initial={existing ?? blank(whatsapp)} isNew={isNew} />;
}

function Editor({ initial, isNew }: { initial: AdminService; isNew: boolean }) {
  const router = useRouter();
  const salon = useAdminSalon();
  const specialists = salon.specialists.filter((sp) => sp.status !== 'archived');
  const categories = Array.from(new Set(salon.services.map((x) => x.category)));
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<AdminService>(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const dirty = JSON.stringify(s) !== baseline;
  const [include, setInclude] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<AdminService>) => setS((x) => ({ ...x, ...patch }));

  const save = async () => {
    const slug = s.slug || slugify(s.name);
    const errs: Record<string, string> = {};
    if (!s.name.trim()) errs.name = 'Enter a service name.';
    if (isNew && salon.services.some((x) => x.slug === slug)) errs.name = 'A service with this name already exists.';
    if (!s.shortDescription.trim()) errs.short = 'Add a one-line description.';
    if (s.status === 'published' && !s.image) errs.image = 'Add an image before publishing.';
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error('Please fix the highlighted fields.');
    setSaving(true);
    const res = await saveService({ ...s, slug, name: s.name.trim() }, isNew ? undefined : initial.slug).catch(
      () => null,
    );
    setSaving(false);
    if (!res?.ok) return toast.error(res?.error ?? 'Could not save the service.');
    setBaseline(JSON.stringify(s));
    toast.success(isNew ? 'Service created' : 'Service saved', {
      description: s.status === 'published' ? 'Visible on the salon pages.' : 'Saved as draft.',
    });
    if (isNew && 'slug' in res && res.slug) router.replace(`/admin/salon/services/${res.slug}`);
    else router.refresh();
  };

  const upload = async (f?: File) => {
    if (!f) return;
    try {
      set({ image: await uploadAdminImage(f, 'salon', 'services') });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read image');
    }
  };

  return (
    <div className="pb-24">
      <PageHeader
        back={{ to: '/admin/salon/services', label: 'Services' }}
        title={isNew ? 'Add service' : s.name || 'Untitled service'}
        actions={
          <>
            {!isNew && s.status !== 'archived' && (
              <AdminButton
                variant="dangerGhost"
                onClick={async () => {
                  const res = await setServiceStatus(s.slug, 'archived').catch(() => null);
                  if (!res?.ok) return toast.error(res?.error ?? 'Could not archive the service.');
                  set({ status: 'archived' });
                  setBaseline(JSON.stringify({ ...s, status: 'archived' }));
                  toast.success('Service archived');
                  router.refresh();
                }}
              >
                Archive
              </AdminButton>
            )}
            {!isNew && (
              <AdminButton variant="dangerGhost" onClick={() => setConfirmDelete(true)}>
                Delete
              </AdminButton>
            )}
            <AdminButton variant="primary" onClick={save} loading={saving}>
              {isNew ? 'Create service' : 'Save changes'}
            </AdminButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Panel title="Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AdminInput
                id="s-name"
                label="Service name"
                value={s.name}
                error={errors.name}
                onChange={(e) => set({ name: e.target.value })}
                wrapperClassName="sm:col-span-2"
              />
              <AdminInput
                id="s-cat"
                label="Category"
                list="s-cats"
                value={s.category}
                onChange={(e) => set({ category: e.target.value })}
              />
              <datalist id="s-cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <AdminInput
                id="s-wa"
                label="WhatsApp number"
                value={s.whatsapp}
                onChange={(e) => set({ whatsapp: e.target.value })}
                hint="International format, e.g. 2348012345678"
              />
              <AdminInput
                id="s-short"
                label="Short description"
                value={s.shortDescription}
                error={errors.short}
                onChange={(e) => set({ shortDescription: e.target.value })}
                wrapperClassName="sm:col-span-2"
              />
              <AdminTextarea
                id="s-desc"
                label="Full description"
                value={s.description}
                onChange={(e) => set({ description: e.target.value })}
                wrapperClassName="sm:col-span-2"
                className="min-h-[120px]"
              />
            </div>
          </Panel>

          <Panel title="Pricing & duration" description="Leave the price empty to show “Price on consultation”.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AdminInput
                id="s-price"
                label="Starting price"
                prefix="₦"
                inputMode="numeric"
                value={s.startingPrice ?? ''}
                onChange={(e) =>
                  set({
                    startingPrice: e.target.value.trim()
                      ? Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0)
                      : null,
                  })
                }
              />
              <AdminInput
                id="s-dur"
                label="Duration (shown)"
                value={s.duration ?? ''}
                placeholder="e.g. 1–2 hours"
                onChange={(e) => set({ duration: e.target.value || null })}
              />
              <AdminInput
                id="s-mins"
                label="Booking length (min)"
                inputMode="numeric"
                value={s.durationMinutes}
                onChange={(e) =>
                  set({ durationMinutes: Math.max(15, Number(e.target.value.replace(/\D/g, '')) || 15) })
                }
              />
            </div>
          </Panel>

          <Panel title="What’s included">
            {s.includes.length > 0 && (
              <ul className="mb-3 space-y-1.5">
                {s.includes.map((inc, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-1.5 text-[13px] text-ink">
                    <span className="flex-1">{inc}</span>
                    <button
                      type="button"
                      onClick={() => set({ includes: s.includes.filter((_, j) => j !== i) })}
                      className="text-subtle hover:text-red-700"
                      aria-label={`Remove ${inc}`}
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (include.trim()) {
                  set({ includes: [...s.includes, include.trim()] });
                  setInclude('');
                }
              }}
              className="flex gap-2"
            >
              <label htmlFor="s-inc" className="sr-only">
                Add included item
              </label>
              <input
                id="s-inc"
                value={include}
                onChange={(e) => setInclude(e.target.value)}
                placeholder="e.g. Cuticle care"
                className="h-9 min-w-0 flex-1 rounded-lg border border-line px-3 text-[13px] focus:border-ink focus:outline-none"
              />
              <AdminButton type="submit" icon={<PlusIcon className="h-4 w-4" />}>
                Add
              </AdminButton>
            </form>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Visibility">
            <AdminSelect
              id="s-status"
              label="Status"
              value={s.status}
              onChange={(e) => set({ status: e.target.value as AdminService['status'] })}
              options={[
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
            <div className="mt-4">
              <Toggle
                label="Accept online bookings"
                description="When off, customers are sent to WhatsApp instead."
                checked={s.bookable}
                onChange={(v) => set({ bookable: v })}
              />
            </div>
          </Panel>

          <Panel title="Image">
            {s.image ? (
              <img src={s.image} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-line text-xs text-subtle">
                No image
              </div>
            )}
            {errors.image && <p className="mt-2 text-xs text-red-700">{errors.image}</p>}
            <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink/40">
              {s.image ? 'Replace image' : 'Upload image'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
          </Panel>

          <Panel
            title="Specialists"
            description={isNew ? 'Save the service first to assign specialists.' : 'Who can perform this service.'}
          >
            {!isNew && (
              <ul className="space-y-2.5">
                {specialists.map((sp) => (
                  <li key={sp.id}>
                    <Toggle
                      label={sp.name}
                      description={`${sp.title}${sp.status === 'on-leave' ? ' · on leave' : ''}`}
                      checked={sp.serviceSlugs.includes(s.slug)}
                      onChange={async (on) => {
                        const res = await assignSpecialist(sp.id, s.slug, on).catch(() => null);
                        if (!res?.ok) return toast.error(res?.error ?? 'Could not update the specialist.');
                        toast.success(on ? `${sp.name} assigned` : `${sp.name} removed`);
                        router.refresh();
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          const res = await deleteService(s.slug).catch(() => null);
          setConfirmDelete(false);
          if (!res?.ok) return toast.error(res?.error ?? 'Could not delete the service.');
          toast.success('Service deleted');
          router.push('/admin/salon/services');
        }}
        title={`Delete ${s.name}?`}
        tone="danger"
        confirmLabel="Delete service"
        message="Existing appointments keep their details, but customers can no longer book this service. Archive instead to keep it for later."
      />
      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onReset={() => setS(JSON.parse(baseline))}
        label={isNew ? 'New service — not saved yet' : 'Unsaved changes'}
      />
    </div>
  );
}
