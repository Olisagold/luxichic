'use client';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { DeliveryRate } from '@/types/admin';
import { useActor } from '@/hooks/useActor';
import { getDb } from '@/lib/mock-db/db';
import { updateSettings } from '@/lib/mock-db/settings';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput } from '@/components/admin/ui/AdminField';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { Toggle } from '@/components/admin/ui/Toggle';
import { SaveBar } from '@/components/admin/content/SaveBar';
import { formatNaira } from '@/lib/utils/currency';
import { cn } from '@/lib/utils/cn';

export function DeliverySettings() {
  const actor = useActor();
  const initial = getDb().settings.delivery;
  const [rates, setRates] = useState<DeliveryRate[]>(initial.rates);
  const [estimate, setEstimate] = useState(initial.estimate);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [q, setQ] = useState('');
  const [bulk, setBulk] = useState('');
  const dirty = JSON.stringify({ rates, estimate }) !== baseline;

  const shown = useMemo(() => rates.filter((r) => r.state.toLowerCase().includes(q.toLowerCase())), [rates, q]);
  const patch = (state: string, p: Partial<DeliveryRate>) =>
    setRates((rs) => rs.map((r) => (r.state === state ? { ...r, ...p } : r)));

  const save = () => {
    const value = { rates, estimate };
    updateSettings(actor, 'delivery', value, 'Delivery', 'Updated delivery fees');
    setBaseline(JSON.stringify(value));
    toast.success('Delivery settings saved', { description: 'Checkout uses the new fees immediately.' });
  };

  return (
    <div className="pb-20">
      <PageHeader
        title="Delivery"
        description="Set the delivery fee for each state, offer free delivery, or switch delivery off for a state."
      />
      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel title="General">
            <AdminInput
              id="del-est"
              label="Delivery estimate shown to customers"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              placeholder="e.g. 1–3 working days in Lagos"
            />
          </Panel>
          <Panel title="Set many at once" description="Applies to every state currently shown in the list.">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(bulk.replace(/\D/g, ''));
                if (!n) return;
                setRates((rs) =>
                  rs.map((r) => (shown.some((s) => s.state === r.state) ? { ...r, fee: n, free: false } : r)),
                );
                toast.success(`Fee set for ${shown.length} states — save to apply`);
                setBulk('');
              }}
              className="flex gap-2"
            >
              <AdminInput
                id="del-bulk"
                label="Fee"
                prefix="₦"
                inputMode="numeric"
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                wrapperClassName="flex-1"
              />
              <AdminButton type="submit" className="self-end">
                Apply
              </AdminButton>
            </form>
          </Panel>
          <Panel title="Summary">
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-subtle">States delivering</dt>
                <dd className="font-semibold text-ink">
                  {rates.filter((r) => r.enabled).length} / {rates.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-subtle">Free delivery</dt>
                <dd className="font-semibold text-ink">{rates.filter((r) => r.enabled && r.free).length}</dd>
              </div>
            </dl>
          </Panel>
        </div>

        <Panel
          title="Fees by state"
          bodyClassName="p-0"
          actions={<SearchInput value={q} onChange={setQ} placeholder="Find a state" className="w-48" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead className="border-b border-line text-xs text-subtle">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">State</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Fee</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Free</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Delivers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((r) => (
                  <tr key={r.state} className={cn(!r.enabled && 'bg-canvas/50')}>
                    <td className={cn('px-5 py-2 font-medium', r.enabled ? 'text-ink' : 'text-subtle')}>{r.state}</td>
                    <td className="px-2 py-2">
                      <div className="relative w-32">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle">
                          ₦
                        </span>
                        <input
                          aria-label={`${r.state} fee`}
                          inputMode="numeric"
                          disabled={!r.enabled || r.free}
                          value={r.free ? 0 : r.fee}
                          onChange={(e) => patch(r.state, { fee: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                          className="h-8 w-full rounded-md border border-line pl-6 pr-2 tabular-nums disabled:bg-canvas disabled:text-subtle"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Toggle
                        srOnlyLabel
                        label={`Free delivery to ${r.state}`}
                        checked={r.free}
                        disabled={!r.enabled}
                        onChange={(v) => patch(r.state, { free: v })}
                      />
                    </td>
                    <td className="px-5 py-2">
                      <span className="flex items-center gap-3">
                        <Toggle
                          srOnlyLabel
                          label={`Deliver to ${r.state}`}
                          checked={r.enabled}
                          onChange={(v) => patch(r.state, { enabled: v })}
                        />
                        <span className="text-xs text-subtle">
                          {!r.enabled ? 'Unavailable' : r.free ? 'Free' : formatNaira(r.fee)}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <SaveBar
        dirty={dirty}
        onSave={save}
        onReset={() => {
          const b = JSON.parse(baseline);
          setRates(b.rates);
          setEstimate(b.estimate);
        }}
      />
    </div>
  );
}
