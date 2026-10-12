'use client';

import React, { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useStorefront } from '@/components/storefront/StorefrontProvider';
import { formatNaira } from '@/lib/utils/currency';

function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="rounded-full p-1.5 text-subtle transition-colors duration-150 hover:text-ink"
      aria-label={`Copy ${label}`}
    >
      {copied ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <CopyIcon className="h-4 w-4" />}
    </button>
  );
}

export function BankTransferInstructions({ amount, reference }: { amount: number; reference?: string }) {
  const { bank } = useStorefront().checkout;
  if (!bank) {
    return (
      <p className="rounded-2xl bg-ivory p-5 text-sm leading-relaxed text-ink">
        Bank transfer details are being updated. Please contact LUXICHIC on WhatsApp to complete your payment.
      </p>
    );
  }
  const rows = [
    { label: 'Bank name', value: bank.bankName },
    { label: 'Account name', value: bank.accountName },
    { label: 'Account number', value: bank.accountNumber, copy: true },
    { label: 'Amount to transfer', value: formatNaira(amount), copy: true, raw: String(amount) },
  ];

  return (
    <div className="rounded-2xl bg-ivory p-5">
      {reference && (
        <div className="mb-5 rounded-xl bg-ink p-5 text-white">
          <p className="text-xs font-semibold text-white/70">Your LUXICHIC transaction reference</p>
          <p className="mt-0.5 text-xs text-white/60">Enter this as the narration / description of your transfer.</p>
          <div className="mt-1 flex items-center gap-3">
            <p className="font-mono text-3xl font-semibold tracking-[0.2em] text-pink md:text-4xl">{reference}</p>
            <span className="text-white [&_button]:text-white/70 [&_button:hover]:text-white">
              <CopyValue value={reference} label="transaction reference" />
            </span>
          </div>
        </div>
      )}
      <dl className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 py-3 text-sm">
            <dt className="text-subtle">{r.label}</dt>
            <dd className="flex items-center gap-1 text-right font-semibold tabular-nums text-ink">
              {r.value}
              {r.copy && <CopyValue value={r.raw ?? r.value} label={r.label.toLowerCase()} />}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 rounded-xl bg-blush/70 p-4 text-sm leading-relaxed text-ink">
        {reference ? (
          <>
            Please use <strong className="font-mono tracking-wider">{reference}</strong> as the narration or description
            when making your bank transfer, so we can match your payment to your order.
          </>
        ) : (
          'Please use your LUXICHIC transaction reference as the narration or description when making your bank transfer.'
        )}
      </p>
    </div>
  );
}
