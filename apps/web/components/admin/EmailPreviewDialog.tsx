'use client';

import React, { useEffect, useState } from 'react';
import { MailCheckIcon, MailWarningIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { previewCustomerEmail, type EmailPreviewRequest, type EmailPreviewResult } from '@/lib/email/preview';

export type EmailPreview = EmailPreviewRequest;

/** The email the customer gets for an order or appointment change, rendered on the server as it's sent. */
export function EmailPreviewDialog({ preview, onClose }: { preview: EmailPreview | null; onClose: () => void }) {
  const [result, setResult] = useState<EmailPreviewResult | null>(null);

  useEffect(() => {
    if (!preview) return;
    let live = true;
    setResult(null);
    previewCustomerEmail(preview)
      .catch(() => ({ ok: false as const, error: 'Could not load the email.' }))
      .then((r) => live && setResult(r));
    return () => {
      live = false;
    };
  }, [preview]);

  return (
    <Modal open={!!preview} onClose={onClose} title="Customer email" className="max-w-2xl rounded-2xl">
      <div className="space-y-4 p-5">
        {!result ? (
          <p className="py-10 text-center text-[13px] text-subtle" aria-busy="true">
            Loading the email…
          </p>
        ) : !result.ok ? (
          <p className="py-10 text-center text-[13px] text-red-700">{result.error}</p>
        ) : (
          <>
            <p
              className={
                result.sent
                  ? 'flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900'
                  : 'flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900'
              }
            >
              {result.sent ? (
                <MailCheckIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <MailWarningIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              {result.sent ? 'Sent to the customer automatically when this happens.' : result.reason}
            </p>
            <dl className="space-y-1 text-[13px]">
              <div className="flex gap-2">
                <dt className="w-16 text-subtle">To</dt>
                <dd className="text-ink">{result.to}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 text-subtle">Subject</dt>
                <dd className="font-semibold text-ink">{result.subject}</dd>
              </div>
            </dl>
            <iframe
              title="Email preview"
              srcDoc={result.html}
              sandbox=""
              className="h-[60vh] w-full rounded-lg border border-line bg-white"
            />
          </>
        )}
        <div className="flex justify-end">
          <AdminButton variant="primary" onClick={onClose}>
            Done
          </AdminButton>
        </div>
      </div>
    </Modal>
  );
}
