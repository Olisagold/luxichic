'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { MailIcon } from 'lucide-react';
import type { EmailTemplate } from '@/types/admin';
import { useRouter } from 'next/navigation';
import { useAdminSettings } from '@/components/admin/AdminSettingsProvider';
import { saveEmailSender, saveEmailTemplate } from '@/lib/settings/admin-actions';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminTextarea } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';
import { fillTemplate } from '@/lib/utils/text';
import { cn } from '@/lib/utils/cn';

const sample: Record<string, string> = {
  customer_name: 'Chioma Eze',
  order_number: 'LXC-482913',
  transaction_reference: '58310472',
  total_amount: '₦287,500',
  service_name: 'Manicure',
  appointment_date: 'Tuesday, 15 December 2026',
  appointment_time: '2:00 PM',
  original_date: 'Monday, 14 December 2026',
  original_time: '11:00 AM',
  specialist_name: 'Specialist A',
  reason: 'Selected specialist unavailable',
  account_link: 'https://luxichic.example/create-account?token=•••',
  reset_link: 'https://luxichic.example/reset-password?token=•••',
  admin_name: 'LUXICHIC Admin',
  admin_email: 'demoadmin@luxichic.com',
  login_date: '3 October 2026',
  login_time: '9:41 AM',
  device: 'Chrome · macOS',
  appointment_reference: 'APT-310245',
};

export function EmailSettings() {
  const router = useRouter();
  const { templates } = useAdminSettings();
  const [tab, setTab] = useState<'templates' | 'sender'>('templates');
  const [activeId, setActiveId] = useState(templates[0]?.id ?? '');
  const active = templates.find((t) => t.id === activeId);

  return (
    <div>
      <PageHeader title="Email" description="Customer and admin emails, and who they’re sent from." />
      <div className="mb-5 flex gap-1 border-b border-line" role="tablist">
        {(['templates', 'sender'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2.5 text-[13px] font-semibold',
              tab === t ? 'border-pink text-ink' : 'border-transparent text-subtle hover:text-ink',
            )}
          >
            {t === 'templates' ? 'Templates' : 'Sender'}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Email templates" className="rounded-xl border border-line bg-white p-1.5 lg:self-start">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                aria-current={t.id === activeId}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium',
                  t.id === activeId ? 'bg-ink text-white' : 'text-charcoal hover:bg-canvas',
                )}
              >
                <span className="truncate">{t.name}</span>
                {!t.enabled && (
                  <span className={cn('text-[10px]', t.id === activeId ? 'text-white/70' : 'text-subtle')}>Off</span>
                )}
              </button>
            ))}
          </nav>
          {active && (
            <TemplateEditor
              key={active.id}
              template={active}
              onSave={async (t) => {
                const res = await saveEmailTemplate(t).catch(() => null);
                if (!res?.ok) return toast.error(res?.error ?? 'Could not save the template.');
                toast.success('Template saved');
                router.refresh();
              }}
            />
          )}
        </div>
      ) : (
        <SenderForm />
      )}
    </div>
  );
}

function TemplateEditor({ template, onSave }: { template: EmailTemplate; onSave: (t: EmailTemplate) => void }) {
  const [t, setT] = useState(template);
  const dirty = JSON.stringify(t) !== JSON.stringify(template);
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Panel
        title={template.name}
        actions={
          <AdminButton size="sm" variant="primary" disabled={!dirty} onClick={() => onSave(t)}>
            Save
          </AdminButton>
        }
      >
        <div className="space-y-4">
          <Toggle label="Send this email" checked={t.enabled} onChange={(v) => setT({ ...t, enabled: v })} />
          <AdminInput
            id="tpl-subj"
            label="Subject"
            value={t.subject}
            onChange={(e) => setT({ ...t, subject: e.target.value })}
          />
          <AdminTextarea
            id="tpl-body"
            label="Message"
            value={t.body}
            onChange={(e) => setT({ ...t, body: e.target.value })}
            className="min-h-[260px] font-mono text-xs"
          />
          {t.variables.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-charcoal">Insert a variable</p>
              <div className="flex flex-wrap gap-1.5">
                {t.variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setT({ ...t, body: `${t.body}{{${v}}}` })}
                    className="rounded-md bg-canvas px-2 py-1 font-mono text-[11px] text-ink hover:bg-line"
                  >{`{{${v}}}`}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Panel>
      <section className="overflow-hidden rounded-xl border border-line bg-white" aria-label="Email preview">
        <header className="border-b border-line px-5 py-3">
          <p className="text-xs text-subtle">Preview with sample details</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{fillTemplate(t.subject, sample)}</p>
        </header>
        <div className="bg-canvas p-5">
          <div className="mx-auto max-w-md rounded-lg bg-white">
            <div className="bg-ink px-5 py-3 font-display text-lg tracking-wide text-white">LUXICHIC</div>
            <p className="whitespace-pre-wrap px-5 py-4 text-[13px] leading-relaxed text-charcoal">
              {fillTemplate(t.body, sample)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Who customer emails come from. Sending (Resend) starts in Phase 9; the API key stays in the environment. */
function SenderForm() {
  const router = useRouter();
  const { email, resendConfigured } = useAdminSettings();
  const [sender, setSender] = useState(email);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await saveEmailSender(sender).catch(() => null);
    setSaving(false);
    if (!res?.ok) return toast.error(res?.error ?? 'Could not save the sender.');
    toast.success('Email sender saved');
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title="Sender" description="How customer emails appear in their inbox.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminInput
            id="em-name"
            label="Sender name"
            value={sender.senderName}
            onChange={(e) => setSender({ ...sender, senderName: e.target.value })}
          />
          <AdminInput
            id="em-from"
            type="email"
            label="Send from"
            value={sender.senderEmail}
            placeholder="hello@yourdomain.com"
            onChange={(e) => setSender({ ...sender, senderEmail: e.target.value })}
            hint="Must be on the domain verified in Resend."
          />
          <AdminInput
            id="em-reply"
            type="email"
            label="Replies go to"
            optional
            value={sender.replyTo}
            onChange={(e) => setSender({ ...sender, replyTo: e.target.value })}
          />
        </div>
        <AdminButton variant="primary" className="mt-5" loading={saving} onClick={save}>
          Save sender
        </AdminButton>
      </Panel>
      <Panel title="Email service">
        <div className="space-y-2 text-[13px] text-charcoal">
          <p className="flex items-center gap-1.5">
            <MailIcon className="h-4 w-4 text-ink" aria-hidden />
            Sent with <strong className="text-ink">Resend</strong>
          </p>
          <p>
            API key:{' '}
            <strong className={resendConfigured ? 'text-emerald-700' : 'text-amber-700'}>
              {resendConfigured ? 'set on the server' : 'not set yet'}
            </strong>
          </p>
          <p className="text-xs text-subtle">
            The key lives only in the server’s environment (RESEND_API_KEY), never here. Emails start sending once the
            domain is verified at launch.
          </p>
        </div>
      </Panel>
    </div>
  );
}
