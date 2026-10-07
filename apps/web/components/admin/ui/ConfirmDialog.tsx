'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminTextarea } from '@/components/admin/ui/AdminField';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'default';
  /** Require a written reason before confirming (rejections, cancellations). */
  requireReason?: {label: string;placeholder?: string;};
  /** Require ticking an acknowledgement checkbox (payment verification). */
  acknowledgement?: string;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'default', requireReason, acknowledgement, children
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [ack, setAck] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setAck(false);
      setError('');
    }
  }, [open]);

  const submit = () => {
    if (requireReason && reason.trim().length < 3) return setError('Please give a reason.');
    onConfirm(reason.trim());
  };

  const blocked = !!acknowledgement && !ack || !!requireReason && reason.trim().length < 3;

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-md rounded-2xl">
      <div className="space-y-4 p-5">
        <div className="flex gap-3">
          <span className={tone === 'danger' ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700' : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700'}>
            <AlertTriangleIcon className="h-4 w-4" aria-hidden />
          </span>
          <div className="text-[13px] leading-relaxed text-charcoal">{message}</div>
        </div>
        {children}
        {requireReason &&
        <AdminTextarea
          id="confirm-reason"
          label={requireReason.label}
          placeholder={requireReason.placeholder}
          value={reason}
          error={error}
          onChange={(e) => {setReason(e.target.value);setError('');}} />

        }
        {acknowledgement &&
        <label className="flex items-start gap-2.5 rounded-lg bg-canvas p-3 text-[13px] font-medium text-ink">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ink" />
            {acknowledgement}
          </label>
        }
        <div className="flex justify-end gap-2 pt-1">
          <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant={tone === 'danger' ? 'danger' : 'primary'} onClick={submit} disabled={blocked}>{confirmLabel}</AdminButton>
        </div>
      </div>
    </Modal>);

}