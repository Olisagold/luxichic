'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CopyIcon, ExternalLinkIcon, LinkIcon, SendIcon, UnlinkIcon } from 'lucide-react';
import { useAdminSettings, type TelegramSpecialist } from '@/components/admin/AdminSettingsProvider';
import {
  createSpecialistTelegramLink,
  createTelegramGroupLink,
  disconnectSpecialistTelegram,
  disconnectTelegramGroup,
  saveTelegram,
  sendTelegramTest,
  type TelegramTarget,
} from '@/lib/settings/admin-actions';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminTextarea } from '@/components/admin/ui/AdminField';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { Toggle } from '@/components/admin/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SaveBar } from '@/components/admin/content/SaveBar';
import { formatDateTime } from '@/lib/utils/dates';

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

type Group = 'appointments' | 'orders';
type Pending = { title: string; link: string; steps: string[]; share?: string } | null;

/**
 * Telegram alerts: new bookings to the appointments group and privately to the specialist they're for; new orders
 * to the orders group. Groups and specialists connect with one-tap links (no chat IDs to copy). The bot token stays
 * in the server's environment (TELEGRAM_BOT_TOKEN) and is never stored or shown.
 */
export function TelegramSettings() {
  const router = useRouter();
  const { telegram } = useAdminSettings();
  const { status, envChatId, specialists } = telegram;
  const initial = {
    chatId: telegram.chatId,
    ordersChatId: telegram.ordersChatId,
    notifyOrders: telegram.notifyOrders,
    notifyAppointments: telegram.notifyAppointments,
    notifySpecialists: telegram.notifySpecialists,
    orderTemplate: telegram.orderTemplate,
    appointmentTemplate: telegram.appointmentTemplate,
  };
  const [t, setT] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [unlinking, setUnlinking] = useState<{ group?: Group; specialist?: TelegramSpecialist } | null>(null);
  const dirty = JSON.stringify(t) !== baseline;

  const save = async () => {
    setSaving(true);
    const res = await saveTelegram({
      ...t,
      chatTitle: telegram.chatTitle,
      ordersChatTitle: telegram.ordersChatTitle,
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) return toast.error(res?.error ?? 'Could not save the Telegram settings.');
    setBaseline(JSON.stringify(t));
    toast.success('Telegram settings saved');
    router.refresh();
  };

  /** Runs one of the connection actions, reporting the result. */
  const run = async <R extends { ok: boolean; error?: string }>(key: string, action: () => Promise<R>) => {
    if (dirty && key.startsWith('test')) {
      toast.error('Save your changes first.');
      return null;
    }
    setBusy(key);
    const res = await action().catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      toast.error(res?.error ?? 'Something went wrong. Please try again.');
      return null;
    }
    return res;
  };

  const test = async (target: TelegramTarget, key: string) => {
    if (await run(key, () => sendTelegramTest(target))) {
      toast.success('Test message sent', { description: 'Check Telegram.' });
    }
  };

  const connectGroup = async (group: Group) => {
    const res = await run(`link-${group}`, () => createTelegramGroupLink(group));
    if (res?.link) {
      setPending({
        title: group === 'orders' ? 'Connect the orders group' : 'Connect the appointments group',
        link: res.link,
        steps: [
          'Open the link on a phone or computer with Telegram.',
          `Choose the ${group === 'orders' ? 'orders' : 'appointments'} group and add the bot.`,
          'The bot posts a confirmation in the group. Then refresh this page.',
        ],
      });
    }
  };

  const connectSpecialist = async (sp: TelegramSpecialist) => {
    const res = await run(`link-${sp.id}`, () => createSpecialistTelegramLink(sp.id));
    if (res?.link) {
      setPending({
        title: `Connect ${sp.name}`,
        link: res.link,
        steps: [
          `Send this link to ${sp.name} (WhatsApp works well). It’s personal: only for them.`,
          'They open it in Telegram and press Start.',
          'The bot confirms; their bookings then arrive in their own chat. The link works once, for 7 days.',
        ],
        share: `Hi ${sp.name}, tap this link and press Start to get your LUXICHIC bookings on Telegram: ${res.link}`,
      });
    }
  };

  const confirmUnlink = async () => {
    const u = unlinking;
    setUnlinking(null);
    if (!u) return;
    const res = u.group
      ? await run(`unlink-${u.group}`, () => disconnectTelegramGroup(u.group!))
      : await run(`unlink-${u.specialist!.id}`, () => disconnectSpecialistTelegram(u.specialist!.id));
    if (res) {
      toast.success('Disconnected');
      router.refresh();
    }
  };

  const insert = (field: 'orderTemplate' | 'appointmentTemplate', v: string) =>
    setT({ ...t, [field]: `${t[field]}{{${v}}}` });

  const groupCard = (group: Group) => {
    const id = group === 'orders' ? t.ordersChatId : t.chatId;
    const title = group === 'orders' ? telegram.ordersChatTitle : telegram.chatTitle;
    const savedId = group === 'orders' ? telegram.ordersChatId : telegram.chatId;
    const usingEnv = group === 'appointments' && !savedId && envChatId;
    const connected = !!savedId || usingEnv;
    return (
      <div className="rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[13px] font-semibold text-ink">
              {group === 'orders' ? 'Orders group' : 'Appointments group'}
            </p>
            <p className="text-xs text-subtle">
              {group === 'orders'
                ? 'New orders only. For the CEO and the order manager.'
                : 'Every booking, from all specialists. For the CEO and the salon manager.'}
            </p>
          </div>
          <StatusBadge status={connected ? 'Connected' : 'Disconnected'} />
        </div>
        <p className="mt-3 text-[13px] text-charcoal">
          {savedId
            ? title
              ? `Posting to “${title}”.`
              : `Posting to chat ${savedId}.`
            : usingEnv
              ? 'Posting to the chat set on the server (TELEGRAM_ADMIN_CHAT_ID).'
              : group === 'orders'
                ? 'Not connected: new orders aren’t posted to Telegram.'
                : 'Not connected: bookings aren’t posted to a group.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminButton
            size="sm"
            variant="primary"
            icon={<LinkIcon className="h-3.5 w-3.5" />}
            loading={busy === `link-${group}`}
            disabled={!status.connected}
            onClick={() => connectGroup(group)}
          >
            {savedId ? 'Connect a different group' : 'Connect a group'}
          </AdminButton>
          {connected && (
            <AdminButton
              size="sm"
              icon={<SendIcon className="h-3.5 w-3.5" />}
              loading={busy === `test-${group}`}
              disabled={!status.connected}
              onClick={() => test(group, `test-${group}`)}
            >
              Send test
            </AdminButton>
          )}
          {savedId && (
            <AdminButton
              size="sm"
              variant="ghost"
              icon={<UnlinkIcon className="h-3.5 w-3.5" />}
              onClick={() => setUnlinking({ group })}
            >
              Disconnect
            </AdminButton>
          )}
        </div>
        <details className="mt-3 text-xs text-subtle">
          <summary className="cursor-pointer">Enter the chat ID instead</summary>
          <AdminInput
            id={group === 'orders' ? 'tg-orders-chat' : 'tg-chat'}
            label="Chat ID"
            value={id}
            placeholder="-1001234567890"
            onChange={(e) => setT({ ...t, [group === 'orders' ? 'ordersChatId' : 'chatId']: e.target.value.trim() })}
            hint="Send /chatid in the group to get it (groups start with -)."
            wrapperClassName="mt-2"
          />
        </details>
      </div>
    );
  };

  return (
    <div className="pb-20">
      <PageHeader
        title="Telegram"
        description="Bookings go to the appointments group and privately to each specialist; orders go to the orders group."
        actions={<StatusBadge status={status.connected ? 'Connected' : 'Disconnected'} />}
      />
      {!status.connected && (
        <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900">{status.reason}</p>
      )}
      <div className="space-y-5">
        <Panel title="Groups">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {groupCard('appointments')}
            {groupCard('orders')}
          </div>
        </Panel>

        <Panel
          title="Specialists"
          description="Each specialist gets only their own bookings, in their own Telegram chat: new bookings, and when one is confirmed, moved or cancelled."
          bodyClassName="p-0"
        >
          <div className="border-b border-line px-5 py-3">
            <Toggle
              label="Send specialists their own bookings"
              checked={t.notifySpecialists}
              onChange={(v) => setT({ ...t, notifySpecialists: v })}
            />
          </div>
          {specialists.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">Add specialists under Salon → Specialists first.</p>
          ) : (
            <ul className="divide-y divide-line">
              {specialists.map((sp) => (
                <li key={sp.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[13px]">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      {sp.name} <span className="font-normal text-subtle">· {sp.title}</span>
                    </p>
                    <p className="text-xs text-subtle">
                      {sp.telegram
                        ? `Telegram: ${sp.telegram.name}, since ${formatDateTime(sp.telegram.connectedAt)}`
                        : 'Telegram: not connected'}
                      {' · '}
                      {sp.adminName ? `Admin login: ${sp.adminName}` : 'No admin login linked (Admin users)'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminButton
                      size="sm"
                      variant={sp.telegram ? undefined : 'primary'}
                      icon={<LinkIcon className="h-3.5 w-3.5" />}
                      loading={busy === `link-${sp.id}`}
                      disabled={!status.connected}
                      onClick={() => connectSpecialist(sp)}
                    >
                      {sp.telegram ? 'New link' : 'Connect'}
                    </AdminButton>
                    {sp.telegram && (
                      <>
                        <AdminButton
                          size="sm"
                          icon={<SendIcon className="h-3.5 w-3.5" />}
                          loading={busy === `test-${sp.id}`}
                          onClick={() => test({ specialistId: sp.id }, `test-${sp.id}`)}
                        >
                          Test
                        </AdminButton>
                        <AdminButton
                          size="sm"
                          variant="ghost"
                          aria-label={`Disconnect ${sp.name}`}
                          icon={<UnlinkIcon className="h-3.5 w-3.5" />}
                          onClick={() => setUnlinking({ specialist: sp })}
                        >
                          Disconnect
                        </AdminButton>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Group alerts">
          <div className="space-y-3">
            <Toggle
              label="New orders → orders group"
              description="Order number, customer, items, total and payment method."
              checked={t.notifyOrders}
              onChange={(v) => setT({ ...t, notifyOrders: v })}
            />
            <Toggle
              label="Bookings → appointments group"
              description="New bookings, and when a customer cancels or moves one."
              checked={t.notifyAppointments}
              onChange={(v) => setT({ ...t, notifyAppointments: v })}
            />
          </div>
        </Panel>

        <Panel title="Group messages">
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
        <p className="text-xs text-subtle">
          {status.connected ? `Bot: @${status.username}. ` : ''}The bot token is kept only in the server’s environment
          and is never shown or saved here.
        </p>
      </div>

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.title ?? ''}
        className="max-w-lg rounded-2xl"
      >
        {pending && (
          <div className="space-y-4 p-5 text-[13px]">
            <ol className="list-decimal space-y-1 pl-5 text-charcoal">
              {pending.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="break-all rounded-lg bg-canvas px-3 py-2 font-mono text-xs text-ink">{pending.link}</p>
            <div className="flex flex-wrap gap-2">
              <AdminButton
                icon={<CopyIcon className="h-4 w-4" />}
                onClick={() =>
                  navigator.clipboard.writeText(pending.share ?? pending.link).then(
                    () => toast.success('Copied'),
                    () => toast.error('Copy it from the box above.'),
                  )
                }
              >
                Copy {pending.share ? 'message' : 'link'}
              </AdminButton>
              {pending.share ? (
                <AdminButton
                  variant="primary"
                  icon={<ExternalLinkIcon className="h-4 w-4" />}
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(pending.share!)}`, '_blank')}
                >
                  Share on WhatsApp
                </AdminButton>
              ) : (
                <AdminButton
                  variant="primary"
                  icon={<ExternalLinkIcon className="h-4 w-4" />}
                  onClick={() => window.open(pending.link, '_blank')}
                >
                  Open in Telegram
                </AdminButton>
              )}
            </div>
            <div className="flex justify-end">
              <AdminButton
                variant="ghost"
                onClick={() => {
                  setPending(null);
                  router.refresh();
                }}
              >
                Done
              </AdminButton>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!unlinking}
        onClose={() => setUnlinking(null)}
        onConfirm={confirmUnlink}
        tone="danger"
        confirmLabel="Disconnect"
        title={
          unlinking?.group
            ? `Disconnect the ${unlinking.group} group?`
            : `Disconnect ${unlinking?.specialist?.name ?? ''}’s Telegram?`
        }
        message={
          unlinking?.group
            ? 'Alerts stop going to this group until you connect one again.'
            : 'They stop getting their bookings on Telegram until you send them a new link.'
        }
      />

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
