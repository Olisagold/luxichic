'use client';

import React from 'react';
import { MailIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { useDb } from '@/lib/mock-db/db';
import { fillTemplate } from '@/lib/utils/text';

export interface EmailPreview {
  templateId: string;
  to: string;
  values: Record<string, string>;
}

/** Shows the email the backend WOULD send. Nothing is delivered in the prototype. */
export function EmailPreviewDialog({ preview, onClose }: {preview: EmailPreview | null;onClose: () => void;}) {
  const templates = useDb((s) => s.emailTemplates);
  const t = preview ? templates.find((x) => x.id === preview.templateId) : undefined;

  return (
    <Modal open={!!preview && !!t} onClose={onClose} title="Email preview" className="max-w-lg rounded-2xl">
      {preview && t &&
      <div className="space-y-4 p-5">
          <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            <MailIcon className="h-3.5 w-3.5" aria-hidden />
            Prototype — this email would be sent by the backend (SMTP). Nothing has been sent.
          </p>
          <dl className="space-y-1 text-[13px]">
            <div className="flex gap-2"><dt className="w-16 text-subtle">To</dt><dd className="text-ink">{preview.to}</dd></div>
            <div className="flex gap-2"><dt className="w-16 text-subtle">Subject</dt><dd className="font-semibold text-ink">{fillTemplate(t.subject, preview.values)}</dd></div>
          </dl>
          <div className="whitespace-pre-line rounded-lg border border-line bg-canvas/50 p-4 text-[13px] leading-relaxed text-charcoal">
            {fillTemplate(t.body, preview.values)}
          </div>
          <div className="flex justify-end"><AdminButton variant="primary" onClick={onClose}>Done</AdminButton></div>
        </div>
      }
    </Modal>);

}