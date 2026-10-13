'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAdminSettings } from '@/components/admin/AdminSettingsProvider';
import { saveBusiness } from '@/lib/settings/admin-actions';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminInput, AdminTextarea } from '@/components/admin/ui/AdminField';
import { SaveBar } from '@/components/admin/content/SaveBar';
import { isValidEmail } from '@/lib/utils/validation';

type Mode = 'general' | 'business';

/** General (store identity) and Business information share the same settings record. */
export function BusinessSettings({ mode = 'business' }: { mode?: Mode }) {
  const router = useRouter();
  const { settings } = useAdminSettings();
  const [b, setB] = useState(settings.business);
  const [baseline, setBaseline] = useState(JSON.stringify(b));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(b) !== baseline;

  const save = async () => {
    const errs: Record<string, string> = {};
    if (!b.name.trim()) errs.name = 'Enter the business name.';
    if (!isValidEmail(b.email)) errs.email = 'Enter a valid email.';
    if (b.whatsapp && !/^\d{10,15}$/.test(b.whatsapp)) errs.whatsapp = 'Use international format, e.g. 2348012345678.';
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error('Please fix the highlighted fields.');
    setSaving(true);
    const res = await saveBusiness(b, mode).catch(() => null);
    setSaving(false);
    if (!res?.ok) return toast.error(res?.error ?? 'Could not save the settings.');
    setBaseline(JSON.stringify(b));
    router.refresh();
    toast.success('Settings saved', { description: 'Shown across the storefront, footer and emails.' });
  };

  return (
    <div className="pb-20">
      {mode === 'general' ? (
        <>
          <PageHeader title="General" description="Your store’s name and regional settings." />
          <div className="grid max-w-3xl gap-5">
            <Panel title="Store">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AdminInput
                  id="g-name"
                  label="Business name"
                  value={b.name}
                  error={errors.name}
                  onChange={(e) => setB({ ...b, name: e.target.value })}
                  wrapperClassName="sm:col-span-2"
                />
                <AdminInput id="g-cur" label="Currency" value="Nigerian naira (₦)" readOnly />
                <AdminInput id="g-tz" label="Time zone" value="West Africa Time (Lagos)" readOnly />
              </div>
            </Panel>
          </div>
        </>
      ) : (
        <>
          <PageHeader
            title="Business information"
            description="Contact details shown on the Contact page, footer, emails and WhatsApp buttons."
          />
          <div className="grid max-w-3xl gap-5">
            <Panel title="Contact details">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AdminInput
                  id="b-email"
                  type="email"
                  label="Email"
                  value={b.email}
                  error={errors.email}
                  onChange={(e) => setB({ ...b, email: e.target.value })}
                />
                <AdminInput
                  id="b-phone"
                  label="Phone"
                  value={b.phone}
                  onChange={(e) => setB({ ...b, phone: e.target.value })}
                />
                <AdminInput
                  id="b-wa"
                  label="WhatsApp (international format)"
                  value={b.whatsapp}
                  error={errors.whatsapp}
                  onChange={(e) => setB({ ...b, whatsapp: e.target.value.replace(/[^\d]/g, '') })}
                  hint="e.g. 2348012345678"
                />
                <AdminInput
                  id="b-hours"
                  label="Opening hours"
                  value={b.hours}
                  onChange={(e) => setB({ ...b, hours: e.target.value })}
                />
                <AdminTextarea
                  id="b-addr"
                  label="Address"
                  value={b.address}
                  onChange={(e) => setB({ ...b, address: e.target.value })}
                  wrapperClassName="sm:col-span-2"
                  className="min-h-[64px]"
                />
              </div>
            </Panel>
          </div>
        </>
      )}
      <SaveBar dirty={dirty} saving={saving} onSave={save} onReset={() => setB(JSON.parse(baseline))} />
    </div>
  );
}
