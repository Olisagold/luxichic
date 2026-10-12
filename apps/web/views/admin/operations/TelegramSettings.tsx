'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SendIcon } from 'lucide-react';
import { useAdminSettings } from '@/components/admin/AdminSettingsProvider';
import { saveTelegram, sendTelegramTest } from '@/lib/settings/admin-actions';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminTextarea } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SaveBar } from '@/components/admin/content/SaveBar';

const ORDER_VARS = [
  'order_number',
  'customer_name',
  'customer_phone',
  'products',
  'total_amount',
  'payment_method',
  'delivery_state',
  'transaction_reference',
];
const APPOINTMENT_VARS = [
  'appointment_reference',
  'customer_name',
  'customer_phone',
  'service_name',
  'specialist_name',
  'appointment_date',
  'appointment_time',
];

/**
 * Telegram alerts for the team: new orders and new appointments. The bot token stays in the server's environment
 * (TELEGRAM_BOT_TOKEN) and is never stored or shown; alerts start sending in Phase 9.
 */
export function TelegramSettings() {
  const router = useRouter();
  const { telegram } = useAdminSettings();
  const { status, envChatId } = telegram;
  const initial = {
    chatId: telegram.chatId,
    notifyOrders: telegram.notifyOrders,
    notifyAppointments: telegram.notifyAppointments,
    orderTemplate: telegram.orderTemplate,
    appointmentTemplate: telegram.appointmentTemplate,
  };
  const [t, setT] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const dirty = JSON.stringify(t) !== baseline;

  const save = async () => {
    setSaving(true);
    const res = await saveTelegram(t).catch(() => null);
    setSaving(false);
    if (!res?.ok) return toast.error(res?.error ?? 'Could not save the Telegram settings.');
    setBaseline(JSON.stringify(t));
    toast.success('Telegram settings saved');
    router.refresh();
  };

  const test = async () => {
    if (dirty) return toast.error('Save your changes first.');
    setTesting(true);
    const res = await sendTelegramTest().catch(() => null);
    setTesting(false);
    if (!res?.ok) return toast.error(res?.error ?? 'Could not send the test message.');
    toast.success('Test message sent', { description: 'Check the team chat in Telegram.' });
  };

  const insert = (field: 'orderTemplate' | 'appointmentTemplate', v: string) =>
    setT({ ...t, [field]: `${t[field]}{{${v}}}` });

  return (
    <div className="pb-20">
      <PageHeader
        title="Telegram"
        description="Alert the team in Telegram when a new order or appointment comes in."
        actions={<StatusBadge status={status.connected ? 'Connected' : 'Disconnected'} />}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel title="Alert chat">
            <AdminInput
              id="tg-chat"
              label="Chat ID"
              value={t.chatId}
              placeholder={envChatId ? 'Using the chat set on the server' : '-1001234567890'}
              onChange={(e) => setT({ ...t, chatId: e.target.value.trim() })}
              hint="The team group’s ID (groups start with -). Add the bot to the group first."
            />
            <div className="mt-4 space-y-3">
              <Toggle
                label="New orders"
                description="Order number, customer, items, total and payment method."
                checked={t.notifyOrders}
                onChange={(v) => setT({ ...t, notifyOrders: v })}
              />
              <Toggle
                label="New appointments"
                description="Service, specialist, date and time."
                checked={t.notifyAppointments}
                onChange={(v) => setT({ ...t, notifyAppointments: v })}
              />
            </div>
          </Panel>
          <Panel title="Messages">
            <div className="space-y-5">
              {(
                [
                  ['orderTemplate', 'New order', ORDER_VARS],
                  ['appointmentTemplate', 'New appointment', APPOINTMENT_VARS],
                ] as const
              ).map(([field, label, vars]) => (
                <div key={field}>
                  <AdminTextarea
                    id={`tg-${field}`}
                    label={label}
                    value={t[field]}
                    onChange={(e) => setT({ ...t, [field]: e.target.value })}
                    className="min-h-[140px] font-mono text-xs"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {vars.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insert(field, v)}
                        className="rounded-md bg-canvas px-2 py-1 font-mono text-[11px] text-ink hover:bg-line"
                      >{`{{${v}}}`}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <aside className="space-y-5">
          <Panel title="Bot connection">
            {status.connected ? (
              <p className="text-[13px] text-charcoal">
                Connected as <strong className="text-ink">@{status.username}</strong>.
              </p>
            ) : (
              <p className="text-[13px] text-charcoal">{status.reason}</p>
            )}
            <p className="mt-2 text-xs text-subtle">
              The bot token is kept only in the server’s environment and is never shown or saved here.
            </p>
            <AdminButton
              className="mt-4"
              icon={<SendIcon className="h-4 w-4" />}
              loading={testing}
              disabled={!status.connected}
              onClick={test}
            >
              Send test message
            </AdminButton>
          </Panel>
          <p className="rounded-xl bg-canvas p-4 text-xs leading-relaxed text-subtle">
            Alerts start sending once new orders and bookings are wired to Telegram (notifications, Phase 9).
          </p>
        </aside>
      </div>
      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onReset={() => setT(JSON.parse(baseline))}
        label="Telegram changes aren’t saved yet"
      />
    </div>
  );
}
