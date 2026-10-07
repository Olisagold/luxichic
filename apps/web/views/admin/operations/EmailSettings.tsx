'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { MailIcon, SendIcon } from 'lucide-react';
import type { EmailTemplate } from '@/types/admin';
import { useActor } from '@/hooks/useActor';
import { getDb, useDb } from '@/lib/mock-db/db';
import { saveEmailTemplate, updateSettings } from '@/lib/mock-db/settings';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminSelect, AdminTextarea } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';
import { fillTemplate } from '@/lib/utils/text';
import { isValidEmail, wait } from '@/lib/utils/validation';
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
  const actor = useActor();
  const templates = useDb((s) => s.emailTemplates);
  const [tab, setTab] = useState<'templates' | 'smtp'>('templates');
  const [activeId, setActiveId] = useState(templates[0]?.id ?? '');
  const active = templates.find((t) => t.id === activeId);

  return (
    <div>
      <PageHeader title="Email" description="Customer and admin emails, and the mail server they’re sent from." />
      <div className="mb-5 flex gap-1 border-b border-line" role="tablist">
        {(['templates', 'smtp'] as const).map((t) => (
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
            {t === 'templates' ? 'Templates' : 'Mail server (SMTP)'}
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
              onSave={(t) => {
                saveEmailTemplate(actor, t);
                toast.success('Template saved');
              }}
            />
          )}
        </div>
      ) : (
        <SmtpForm />
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

function SmtpForm() {
  const actor = useActor();
  const [smtp, setSmtp] = useState(getDb().settings.smtp);
  const [password, setPassword] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);

  const save = () => {
    if (!smtp.host.trim() || !isValidEmail(smtp.senderEmail))
      return toast.error('Enter the SMTP host and a valid sender email.');
    const next = { ...smtp, passwordSet: smtp.passwordSet || !!password };
    updateSettings(actor, 'smtp', next, 'Email', 'Updated SMTP settings', smtp.host);
    setSmtp(next);
    setPassword('');
    toast.success('Mail server saved', {
      description: password ? 'The password is sent to the server only.' : undefined,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title="SMTP settings">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminInput
            id="smtp-host"
            label="Host"
            value={smtp.host}
            placeholder="smtp.yourprovider.com"
            onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <AdminInput
              id="smtp-port"
              label="Port"
              inputMode="numeric"
              value={smtp.port}
              onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value.replace(/\D/g, '')) || 0 })}
            />
            <AdminSelect
              id="smtp-enc"
              label="Encryption"
              value={smtp.encryption}
              onChange={(e) => setSmtp({ ...smtp, encryption: e.target.value as typeof smtp.encryption })}
              options={['TLS', 'SSL', 'None'].map((v) => ({ value: v, label: v }))}
            />
          </div>
          <AdminInput
            id="smtp-user"
            label="Username"
            autoComplete="off"
            value={smtp.username}
            onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
          />
          <AdminInput
            id="smtp-pass"
            type="password"
            autoComplete="new-password"
            label="Password"
            value={password}
            placeholder={smtp.passwordSet ? '•••••••• (saved)' : ''}
            onChange={(e) => setPassword(e.target.value)}
          />
          <AdminInput
            id="smtp-sname"
            label="Sender name"
            value={smtp.senderName}
            onChange={(e) => setSmtp({ ...smtp, senderName: e.target.value })}
          />
          <AdminInput
            id="smtp-semail"
            type="email"
            label="Sender email"
            value={smtp.senderEmail}
            onChange={(e) => setSmtp({ ...smtp, senderEmail: e.target.value })}
          />
        </div>
        <AdminButton variant="primary" className="mt-5" onClick={save}>
          Save mail server
        </AdminButton>
      </Panel>
      <Panel title="Send a test email">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!isValidEmail(testTo)) return toast.error('Enter a valid email.');
            setTesting(true);
            await wait(900);
            setTesting(false);
            toast.success(`Test email queued to ${testTo}`, {
              description: 'Prototype — sending happens on the server.',
            });
          }}
          className="space-y-3"
        >
          <AdminInput
            id="smtp-test"
            type="email"
            label="Send to"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
          />
          <AdminButton type="submit" loading={testing} disabled={!smtp.host} icon={<SendIcon className="h-4 w-4" />}>
            Send test
          </AdminButton>
          {!smtp.host && (
            <p className="flex items-center gap-1.5 text-xs text-subtle">
              <MailIcon className="h-3.5 w-3.5" aria-hidden />
              Save a mail server first.
            </p>
          )}
        </form>
      </Panel>
    </div>
  );
}
