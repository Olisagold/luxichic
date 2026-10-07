'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { MessageCircleIcon, PlugIcon, SendIcon } from 'lucide-react';
import { useActor } from '@/hooks/useActor';
import { getDb, useDb } from '@/lib/mock-db/db';
import { updateSettings } from '@/lib/mock-db/settings';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminTextarea } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { fillTemplate } from '@/lib/utils/text';
import { wait } from '@/lib/utils/validation';

const sample: Record<string, string> = {
  order_number: 'LXC-482913',
  transaction_reference: '58310472',
  customer_name: 'Chioma Eze',
  customer_phone: '08031234567',
  items: '• Brazilian Bone Straight Wig (22") × 1',
  total_amount: '₦287,500',
  payment_method: 'Bank Transfer',
  delivery_state: 'Lagos',
  appointment_reference: 'APT-310245',
  service_name: 'Manicure',
  appointment_date: 'Tue, 15 Dec 2026',
  appointment_time: '2:00 PM',
  specialist_name: 'Specialist A',
  status: 'Pending',
};

export function WhatsAppSettings() {
  const actor = useActor();
  const live = useDb((s) => s.settings.whatsapp);
  const [w, setW] = useState(getDb().settings.whatsapp);
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [preview, setPreview] = useState<'order' | 'appointment'>('order');

  const save = (next = w, action = 'Updated WhatsApp settings') => {
    updateSettings(actor, 'whatsapp', next, 'WhatsApp', action);
    setW(next);
  };

  const connect = async () => {
    if (!apiKey.trim() && !w.apiKeySet) return toast.error('Enter the API key from your WhatsApp provider.');
    setTesting(true);
    await wait(1100);
    setTesting(false);
    const next = {
      ...w,
      apiKeySet: true,
      apiKeyLast4: apiKey ? apiKey.slice(-4) : w.apiKeyLast4,
      status: 'connected' as const,
    };
    setApiKey('');
    save(next, 'Connected WhatsApp');
    toast.success('Connection test passed', {
      description: 'Prototype — the backend stores the key securely and sends messages.',
    });
  };

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        description="Send new-order and new-appointment alerts to your team on WhatsApp."
        actions={
          <StatusBadge
            status={live.status === 'connected' ? 'Connected' : live.status === 'error' ? 'Error' : 'Disconnected'}
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Panel
            title="Connection"
            description="Your API key is sent to the server and never shown again. Only the last 4 characters are displayed."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput
                id="wa-biz"
                label="Business WhatsApp number"
                value={w.businessNumber}
                onChange={(e) => setW({ ...w, businessNumber: e.target.value })}
                hint="Customers message this number."
              />
              <AdminInput
                id="wa-admin"
                label="Admin alert number"
                value={w.adminNumber}
                onChange={(e) => setW({ ...w, adminNumber: e.target.value })}
                hint="Alerts are sent here."
              />
              <AdminInput
                id="wa-key"
                type="password"
                autoComplete="off"
                label="API key"
                value={apiKey}
                placeholder={w.apiKeySet ? `•••• •••• ${w.apiKeyLast4}` : 'Paste key'}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <AdminInput
                id="wa-hook"
                label="Webhook URL"
                value={w.webhookUrl}
                readOnly
                className="font-mono text-xs"
                hint="Paste this into your provider’s dashboard."
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminButton
                variant="primary"
                loading={testing}
                icon={<PlugIcon className="h-4 w-4" />}
                onClick={connect}
              >
                {w.status === 'connected' ? 'Test connection' : 'Connect'}
              </AdminButton>
              <AdminButton
                onClick={() => {
                  save();
                  toast.success('Numbers saved');
                }}
              >
                Save numbers
              </AdminButton>
              {w.status === 'connected' && (
                <AdminButton
                  variant="dangerGhost"
                  onClick={() => {
                    save({ ...w, status: 'disconnected', apiKeySet: false, apiKeyLast4: '' }, 'Disconnected WhatsApp');
                    toast.success('WhatsApp disconnected');
                  }}
                >
                  Disconnect
                </AdminButton>
              )}
            </div>
          </Panel>

          <Panel title="Alerts">
            <div className="space-y-3.5">
              <Toggle
                label="New order alerts"
                checked={w.notifyOrders}
                onChange={(v) => {
                  save({ ...w, notifyOrders: v });
                  toast.success('Saved');
                }}
              />
              <Toggle
                label="New appointment alerts"
                checked={w.notifyAppointments}
                onChange={(v) => {
                  save({ ...w, notifyAppointments: v });
                  toast.success('Saved');
                }}
              />
            </div>
          </Panel>

          <Panel title="Message templates" description="Use {{variables}} — they’re replaced with real details.">
            <div className="space-y-4">
              <AdminTextarea
                id="wa-order"
                label="New order"
                value={w.orderTemplate}
                onChange={(e) => setW({ ...w, orderTemplate: e.target.value })}
                className="min-h-[180px] font-mono text-xs"
                onFocus={() => setPreview('order')}
              />
              <AdminTextarea
                id="wa-appt"
                label="New appointment"
                value={w.appointmentTemplate}
                onChange={(e) => setW({ ...w, appointmentTemplate: e.target.value })}
                className="min-h-[160px] font-mono text-xs"
                onFocus={() => setPreview('appointment')}
              />
              <AdminButton
                variant="primary"
                onClick={() => {
                  save(w, 'Edited WhatsApp templates');
                  toast.success('Templates saved');
                }}
              >
                Save templates
              </AdminButton>
            </div>
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <MessageCircleIcon className="h-4 w-4" aria-hidden /> Preview
              </h2>
              <div className="flex rounded-md border border-line p-0.5 text-xs">
                {(['order', 'appointment'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPreview(p)}
                    aria-pressed={preview === p}
                    className={
                      preview === p
                        ? 'rounded bg-ink px-2 py-0.5 font-semibold text-white'
                        : 'px-2 py-0.5 text-charcoal'
                    }
                  >
                    {p === 'order' ? 'Order' : 'Appointment'}
                  </button>
                ))}
              </div>
            </header>
            <div className="bg-[#ECE5DD] p-4">
              <div className="ml-auto max-w-[92%] whitespace-pre-wrap rounded-lg rounded-tr-none bg-[#DCF8C6] px-3 py-2 text-[12.5px] leading-relaxed text-[#111]">
                {fillTemplate(preview === 'order' ? w.orderTemplate : w.appointmentTemplate, sample)}
              </div>
            </div>
            <div className="px-4 py-3">
              <AdminButton
                size="sm"
                icon={<SendIcon className="h-3.5 w-3.5" />}
                disabled={w.status !== 'connected'}
                onClick={() =>
                  toast.success(`Test message queued to ${w.adminNumber}`, {
                    description: 'Prototype — no message is actually sent.',
                  })
                }
              >
                Send test message
              </AdminButton>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
