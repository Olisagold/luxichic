'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { PencilIcon, PercentIcon, PlusIcon, TrashIcon } from 'lucide-react';
import type { Discount } from '@/types/admin';
import { useActor } from '@/hooks/useActor';
import { useDb } from '@/lib/mock-db/db';
import { deleteDiscount, saveDiscount } from '@/lib/mock-db/catalog';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { AdminInput, AdminSelect } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatNaira } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/dates';
import { generateId } from '@/lib/utils/references';

const today = () => new Date().toISOString().slice(0, 10);
const blank = (): Discount => ({
  id: '',
  code: '',
  type: 'percent',
  value: 10,
  minSpend: 0,
  startsAt: today(),
  endsAt: '',
  usageLimit: null,
  used: 0,
  active: true,
  scope: 'all',
});

function state(d: Discount): string {
  const t = today();
  if (!d.active) return 'Inactive';
  if (d.startsAt && d.startsAt > t) return 'Scheduled';
  if (d.endsAt && d.endsAt < t) return 'Expired';
  if (d.usageLimit !== null && d.used >= d.usageLimit) return 'Used up';
  return 'Active';
}
const scopeLabel = { all: 'Whole store', hairs: 'LUXICHIC Hairs', tools: 'Hair Tools & Essentials' };

export function Discounts() {
  const actor = useActor();
  const discounts = useDb((s) => s.discounts);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [removing, setRemoving] = useState<Discount | null>(null);

  return (
    <div>
      <PageHeader
        title="Discounts"
        description="Promo codes customers enter at checkout. Product sale prices are set on each product."
        actions={
          <AdminButton variant="primary" icon={<PlusIcon className="h-4 w-4" />} onClick={() => setEditing(blank())}>
            Create code
          </AdminButton>
        }
      />

      <div className="rounded-xl border border-line bg-white">
        {discounts.length === 0 ? (
          <AdminEmpty
            icon={<PercentIcon className="h-5 w-5" />}
            title="No promo codes yet"
            action={
              <AdminButton variant="primary" onClick={() => setEditing(blank())}>
                Create code
              </AdminButton>
            }
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="border-b border-line text-xs text-subtle">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Code</th>
                  <th className="px-2 py-2.5 font-semibold">Discount</th>
                  <th className="px-2 py-2.5 font-semibold">Applies to</th>
                  <th className="px-2 py-2.5 font-semibold">Dates</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Used</th>
                  <th className="px-2 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {discounts.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2.5 font-mono font-bold tracking-wide text-ink">{d.code}</td>
                    <td className="px-2 py-2.5 text-ink">
                      {d.type === 'percent' ? `${d.value}% off` : `${formatNaira(d.value)} off`}
                      {d.minSpend > 0 && (
                        <span className="block text-xs text-subtle">Min. spend {formatNaira(d.minSpend)}</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-charcoal">{scopeLabel[d.scope]}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-xs text-subtle">
                      {d.startsAt ? formatDate(d.startsAt) : 'Now'} – {d.endsAt ? formatDate(d.endsAt) : 'No end'}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-ink">
                      {d.used}
                      {d.usageLimit !== null ? ` / ${d.usageLimit}` : ''}
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={state(d)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <button
                        onClick={() => setEditing(d)}
                        className="rounded-md p-1.5 text-subtle hover:bg-canvas hover:text-ink"
                        aria-label={`Edit ${d.code}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setRemoving(d)}
                        className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${d.code}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DiscountDialog
        key={editing?.id || (editing ? 'new' : 'closed')}
        discount={editing}
        existing={discounts}
        onClose={() => setEditing(null)}
        onSave={(d) => {
          saveDiscount(actor, d);
          toast.success('Promo code saved');
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) deleteDiscount(actor, removing.id);
          setRemoving(null);
          toast.success('Promo code deleted');
        }}
        title={`Delete ${removing?.code}?`}
        tone="danger"
        confirmLabel="Delete code"
        message="Customers will no longer be able to use it. Switch it off instead if you may reuse it."
      />
    </div>
  );
}

function DiscountDialog({
  discount,
  existing,
  onClose,
  onSave,
}: {
  discount: Discount | null;
  existing: Discount[];
  onClose: () => void;
  onSave: (d: Discount) => void;
}) {
  const [d, setD] = useState<Discount>(discount ?? blank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const num = (v: string) => Math.max(0, Number(v.replace(/[^\d]/g, '')) || 0);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = d.code.trim().toUpperCase();
    const errs: Record<string, string> = {};
    if (!/^[A-Z0-9-]{3,20}$/.test(code)) errs.code = 'Use 3–20 letters, numbers or dashes.';
    else if (existing.some((x) => x.code === code && x.id !== d.id)) errs.code = 'This code already exists.';
    if (d.value <= 0 || (d.type === 'percent' && d.value >= 100))
      errs.value = d.type === 'percent' ? 'Enter 1–99%.' : 'Enter an amount above ₦0.';
    if (d.endsAt && d.startsAt && d.endsAt < d.startsAt) errs.endsAt = 'End date is before the start date.';
    setErrors(errs);
    if (!Object.keys(errs).length) onSave({ ...d, code, id: d.id || generateId('disc') });
  };
  return (
    <Modal
      open={!!discount}
      onClose={onClose}
      title={discount?.id ? 'Edit promo code' : 'Create promo code'}
      className="max-w-lg rounded-2xl"
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <AdminInput
          id="d-code"
          label="Code"
          value={d.code}
          error={errors.code}
          onChange={(e) => setD({ ...d, code: e.target.value.toUpperCase() })}
          className="font-mono uppercase tracking-wide"
          placeholder="LUXE10"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminSelect
            id="d-type"
            label="Type"
            value={d.type}
            onChange={(e) => setD({ ...d, type: e.target.value as Discount['type'] })}
            options={[
              { value: 'percent', label: 'Percentage off' },
              { value: 'fixed', label: 'Fixed amount off' },
            ]}
          />
          <AdminInput
            id="d-value"
            label={d.type === 'percent' ? 'Percent' : 'Amount'}
            prefix={d.type === 'fixed' ? '₦' : undefined}
            inputMode="numeric"
            value={d.value || ''}
            error={errors.value}
            onChange={(e) => setD({ ...d, value: num(e.target.value) })}
          />
          <AdminInput
            id="d-min"
            label="Minimum spend"
            prefix="₦"
            inputMode="numeric"
            value={d.minSpend || ''}
            placeholder="0"
            onChange={(e) => setD({ ...d, minSpend: num(e.target.value) })}
          />
          <AdminSelect
            id="d-scope"
            label="Applies to"
            value={d.scope}
            onChange={(e) => setD({ ...d, scope: e.target.value as Discount['scope'] })}
            options={Object.entries(scopeLabel).map(([value, label]) => ({ value, label }))}
          />
          <AdminInput
            id="d-start"
            type="date"
            label="Starts"
            value={d.startsAt}
            onChange={(e) => setD({ ...d, startsAt: e.target.value })}
          />
          <AdminInput
            id="d-end"
            type="date"
            label="Ends"
            optional
            value={d.endsAt}
            error={errors.endsAt}
            onChange={(e) => setD({ ...d, endsAt: e.target.value })}
          />
          <AdminInput
            id="d-limit"
            label="Usage limit"
            optional
            inputMode="numeric"
            value={d.usageLimit ?? ''}
            placeholder="Unlimited"
            onChange={(e) => setD({ ...d, usageLimit: e.target.value.trim() ? num(e.target.value) : null })}
          />
        </div>
        <Toggle
          label="Active"
          description="Customers can use this code within its dates."
          checked={d.active}
          onChange={(v) => setD({ ...d, active: v })}
        />
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary">
            Save code
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}
