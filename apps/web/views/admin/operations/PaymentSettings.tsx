'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { LandmarkIcon, ShieldAlertIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAdminSettings } from '@/components/admin/AdminSettingsProvider';
import { saveBankDetails, setPayOnDelivery } from '@/lib/settings/admin-actions';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminTextarea } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';

export function PaymentSettings() {
  const router = useRouter();
  const s = useAdminSettings().settings;
  const [bank, setBank] = useState(s.bank);
  const [pod, setPod] = useState(s.payOnDeliveryEnabled);
  const [confirm, setConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveBank = () => {
    const errs: Record<string, string> = {};
    if (!bank.bankName.trim()) errs.bankName = 'Enter the bank name.';
    if (!bank.accountName.trim()) errs.accountName = 'Enter the account name.';
    if (!/^\d{10}$/.test(bank.accountNumber)) errs.accountNumber = 'Nigerian account numbers have 10 digits.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setConfirm(true);
  };

  return (
    <div>
      <PageHeader title="Payments" description="Choose how customers pay and the bank details shown at checkout." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Bank transfer" description="Shown on checkout, the order confirmation page and in emails.">
          <div className="space-y-4">
            <AdminInput
              id="bk-name"
              label="Bank name"
              value={bank.bankName}
              error={errors.bankName}
              onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
            />
            <AdminInput
              id="bk-acct"
              label="Account name"
              value={bank.accountName}
              error={errors.accountName}
              onChange={(e) => setBank({ ...bank, accountName: e.target.value })}
            />
            <AdminInput
              id="bk-num"
              label="Account number"
              inputMode="numeric"
              maxLength={10}
              value={bank.accountNumber}
              error={errors.accountNumber}
              onChange={(e) => setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, '') })}
              className="font-mono tracking-wider"
            />
            <AdminTextarea
              id="bk-ins"
              label="Extra payment instructions"
              optional
              value={bank.instructions}
              onChange={(e) => setBank({ ...bank, instructions: e.target.value })}
            />
            <AdminButton variant="primary" onClick={saveBank}>
              Save bank details
            </AdminButton>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Pay on Delivery">
            <Toggle
              label="Offer Pay on Delivery at checkout"
              description="Customers pay cash or transfer when their order arrives."
              checked={pod}
              onChange={async (v) => {
                setPod(v);
                const res = await setPayOnDelivery(v).catch(() => null);
                if (!res?.ok) {
                  setPod(!v);
                  return toast.error(res?.error ?? 'Could not change Pay on Delivery.');
                }
                toast.success(v ? 'Pay on Delivery is on' : 'Pay on Delivery is off');
                router.refresh();
              }}
            />
          </Panel>
          <section className="rounded-xl border border-line bg-white p-5">
            <div className="flex gap-3">
              <LandmarkIcon className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden />
              <div className="text-[13px] leading-relaxed text-charcoal">
                <p className="font-semibold text-ink">How bank transfers are confirmed</p>
                <p className="mt-1">
                  Customers transfer the order total using their unique transaction reference as the narration. Orders
                  stay “Pending verification” until someone with permission checks the business account and confirms it
                  on the order page.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              <ShieldAlertIcon className="h-4 w-4 shrink-0" aria-hidden />
              <p>Never confirm a payment from a screenshot or WhatsApp receipt alone. Always check the bank account.</p>
            </div>
          </section>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          const res = await saveBankDetails(bank).catch(() => null);
          setConfirm(false);
          if (!res?.ok) return toast.error(res?.error ?? 'Could not save the bank details.');
          toast.success('Bank details updated', { description: 'Checkout shows the new account now.' });
          router.refresh();
        }}
        title="Change the bank details customers pay into?"
        tone="danger"
        confirmLabel="Update bank details"
        message={
          <>
            New orders will show{' '}
            <strong>
              {bank.bankName} · {bank.accountName} · {bank.accountNumber}
            </strong>
            . Double-check the account number. Mistakes send customers’ money to the wrong account.
          </>
        }
        acknowledgement="I have checked these bank details are correct."
      />
    </div>
  );
}
