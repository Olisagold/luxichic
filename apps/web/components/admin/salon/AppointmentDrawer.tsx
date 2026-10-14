'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClockIcon, CheckIcon, MailIcon, XIcon } from 'lucide-react';
import type { Appointment } from '@/types/salon';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useRouter } from 'next/navigation';
import { useAdminSalon } from '@/components/admin/AdminSalonProvider';
import {
  adminRescheduleSlots,
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  rejectAppointment,
  rescheduleAppointment,
} from '@/lib/salon/admin-actions';
import type { Slot } from '@/lib/salon/availability';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminSelect, AdminTextarea } from '@/components/admin/ui/AdminField';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { EmailPreviewDialog, type EmailPreview } from '@/components/admin/EmailPreviewDialog';
import { formatDateTime, formatLongDate, formatSlot, toISODate } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';

export function AppointmentDrawer({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
  const { can } = useAdminAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'reject' | 'cancel' | 'reschedule' | null>(null);
  const [email, setEmail] = useState<EmailPreview | null>(null);
  const a = appointment;

  /** Runs a server action, reports the result and reloads the salon data. */
  const run = async (action: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setBusy(true);
    const res = await action().catch(() => null);
    setBusy(false);
    setDialog(null);
    if (!res?.ok) {
      toast.error(res?.error ?? 'Something went wrong. Please try again.');
      return false;
    }
    toast.success(success);
    router.refresh();
    return true;
  };

  const open = a && !['Completed', 'Rejected', 'Cancelled'].includes(a.status);

  return (
    <>
      <Modal open={!!a} onClose={onClose} title={a ? a.reference : 'Appointment'} side="right">
        {a && (
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-[13px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-ink">{a.serviceName}</p>
                <p className="text-charcoal">
                  {formatLongDate(a.date)} · {formatSlot(a.time)}
                </p>
                <p className="text-subtle">{a.personnelName ?? 'No specialist preference'}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
            {a.original && (
              <p className="rounded-lg bg-canvas px-3 py-2 text-xs text-charcoal">
                Originally {formatLongDate(a.original.date)} at {formatSlot(a.original.time)}
                {a.original.personnelName ? ` with ${a.original.personnelName}` : ''}.
              </p>
            )}
            {a.reason && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Reason: {a.reason}</p>}

            <section>
              <h3 className="text-xs font-semibold text-subtle">Customer</h3>
              <p className="mt-1 font-semibold text-ink">{a.customer.fullName}</p>
              <p className="text-charcoal">{a.customer.email}</p>
              <p className="text-charcoal">{a.customer.phone}</p>
              {a.notes && <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-xs">“{a.notes}”</p>}
              <div className="mt-3">
                <WhatsAppButton
                  size="sm"
                  number={a.customer.phone.replace(/\D/g, '').replace(/^0/, '234')}
                  message={`Hello ${a.customer.fullName.split(' ')[0]}, this is LUXICHIC Beauty Salon & Spa about your ${a.serviceName} appointment (${a.reference}).`}
                  label="Message customer"
                />
              </div>
            </section>

            <p className="rounded-lg border border-line px-3 py-2 text-xs text-subtle">
              Payment is collected after the service — no deposit is taken online.
            </p>

            {open && (
              <section className="flex flex-wrap gap-2">
                {['Pending', 'Rescheduled'].includes(a.status) && can('appointments.confirm') && (
                  <AdminButton
                    variant="primary"
                    icon={<CheckIcon className="h-4 w-4" />}
                    disabled={busy}
                    onClick={async () => {
                      if (await run(() => confirmAppointment(a.reference), 'Appointment confirmed')) {
                        setEmail({ appointment: a.reference, event: 'confirmed' });
                      }
                    }}
                  >
                    Confirm
                  </AdminButton>
                )}
                {can('appointments.reschedule') && (
                  <AdminButton icon={<CalendarClockIcon className="h-4 w-4" />} onClick={() => setDialog('reschedule')}>
                    Reschedule
                  </AdminButton>
                )}
                {a.status === 'Confirmed' && can('appointments.confirm') && (
                  <AdminButton
                    disabled={busy}
                    onClick={() => run(() => completeAppointment(a.reference), 'Marked completed')}
                  >
                    Mark completed
                  </AdminButton>
                )}
                {a.status === 'Pending' && can('appointments.reject') && (
                  <AdminButton
                    variant="dangerGhost"
                    icon={<XIcon className="h-4 w-4" />}
                    onClick={() => setDialog('reject')}
                  >
                    Reject
                  </AdminButton>
                )}
                {a.status !== 'Pending' && can('appointments.reject') && (
                  <AdminButton variant="dangerGhost" onClick={() => setDialog('cancel')}>
                    Cancel
                  </AdminButton>
                )}
              </section>
            )}

            <section>
              <h3 className="text-xs font-semibold text-subtle">History</h3>
              <ol className="mt-2 space-y-2.5 border-l border-line pl-4">
                {[...(a.history ?? [{ at: a.createdAt, label: 'Appointment requested' }])].reverse().map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-ink" aria-hidden />
                    <p className="font-medium text-ink">{h.label}</p>
                    {h.note && <p className="text-xs text-charcoal">{h.note}</p>}
                    <p className="text-[11px] text-subtle">
                      {h.by ? `${h.by} · ` : ''}
                      {formatDateTime(h.at)}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <AdminButton
              size="sm"
              variant="ghost"
              icon={<MailIcon className="h-3.5 w-3.5" />}
              onClick={() =>
                setEmail({
                  appointment: a.reference,
                  event:
                    a.status === 'Rescheduled'
                      ? 'rescheduled'
                      : a.status === 'Rejected'
                        ? 'rejected'
                        : a.status === 'Cancelled'
                          ? 'cancelled'
                          : a.status === 'Confirmed' || a.status === 'Completed'
                            ? 'confirmed'
                            : 'booked',
                })
              }
            >
              Preview latest email
            </AdminButton>
          </div>
        )}
      </Modal>

      {a && (
        <>
          <ConfirmDialog
            open={dialog === 'reject'}
            onClose={() => setDialog(null)}
            title="Reject this appointment?"
            tone="danger"
            confirmLabel="Reject"
            message="The customer is emailed your reason and invited to pick another time."
            requireReason={{ label: 'Reason', placeholder: 'e.g. Selected specialist unavailable' }}
            onConfirm={async (reason) => {
              if (await run(() => rejectAppointment(a.reference, reason), 'Appointment rejected')) {
                setEmail({ appointment: a.reference, event: 'rejected' });
              }
            }}
          />

          <ConfirmDialog
            open={dialog === 'cancel'}
            onClose={() => setDialog(null)}
            title="Cancel this appointment?"
            tone="danger"
            confirmLabel="Cancel appointment"
            message="The slot is released and the customer is emailed your reason."
            requireReason={{ label: 'Reason' }}
            onConfirm={(reason) => run(() => cancelAppointment(a.reference, reason), 'Appointment cancelled')}
          />

          <RescheduleDialog
            appointment={a}
            open={dialog === 'reschedule'}
            onClose={() => setDialog(null)}
            onDone={() => {
              setDialog(null);
              toast.success('Appointment rescheduled');
              router.refresh();
              setEmail({ appointment: a.reference, event: 'rescheduled' });
            }}
          />
        </>
      )}
      <EmailPreviewDialog preview={email} onClose={() => setEmail(null)} />
    </>
  );
}

function RescheduleDialog({
  appointment: a,
  open,
  onClose,
  onDone,
}: {
  appointment: Appointment;
  open: boolean;
  onClose: () => void;
  onDone: (n: { date: string; time: string; personnelName?: string; reason: string }) => void;
}) {
  const specialists = useAdminSalon().specialists.filter(
    (sp) => sp.status === 'active' && sp.serviceSlugs.includes(a.serviceSlug),
  );
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(a.date);
  const [time, setTime] = useState('');
  const [spId, setSpId] = useState(a.personnelId ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setDate(a.date);
      setTime('');
      setSpId(a.personnelId ?? '');
      setReason('');
      setError('');
    }
  }, [open, a]);

  // Free times on the chosen day, worked out on the server (this appointment's own time counts as free).
  const [slots, setSlots] = useState<Slot[]>([]);
  useEffect(() => {
    let stale = false;
    setSlots([]);
    if (!open || !date) return;
    adminRescheduleSlots(a.reference, date, spId || null)
      .then((list) => !stale && setSlots(list))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [open, date, spId, a.reference]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return setError('Choose a new date and time.');
    if (reason.trim().length < 3) return setError('Give a reason for the customer.');
    const sp = specialists.find((s) => s.id === spId);
    setSaving(true);
    const res = await rescheduleAppointment(a.reference, {
      date,
      time,
      specialistId: sp?.id ?? null,
      reason: reason.trim(),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) return setError(res?.error ?? 'Could not reschedule the appointment.');
    onDone({ date, time, personnelName: sp?.name, reason: reason.trim() });
  };

  return (
    <Modal open={open} onClose={onClose} title="Reschedule appointment" className="max-w-lg rounded-2xl">
      <form onSubmit={submit} className="space-y-4 p-5">
        <p className="text-[13px] text-charcoal">
          Currently{' '}
          <strong className="text-ink">
            {formatLongDate(a.date)} at {formatSlot(a.time)}
          </strong>
          .
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminInput
            id="rs-date"
            type="date"
            label="New date"
            min={toISODate(new Date())}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTime('');
            }}
          />
          <AdminSelect
            id="rs-sp"
            label="Specialist"
            value={spId}
            onChange={(e) => {
              setSpId(e.target.value);
              setTime('');
            }}
            options={[
              { value: '', label: 'No preference' },
              ...specialists.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </div>
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-charcoal">New time</legend>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
            {slots.map((s) => (
              <button
                key={s.time}
                type="button"
                disabled={!s.available}
                onClick={() => setTime(s.time)}
                aria-pressed={time === s.time}
                className={cn(
                  'h-8 rounded-md border text-xs font-semibold tabular-nums disabled:cursor-not-allowed disabled:border-transparent disabled:bg-canvas disabled:text-muted disabled:line-through',
                  time === s.time ? 'border-ink bg-ink text-white' : 'border-line text-ink hover:border-ink/40',
                )}
                title={!s.available ? 'Unavailable' : undefined}
              >
                {formatSlot(s.time)}
              </button>
            ))}
          </div>
        </fieldset>
        <AdminTextarea
          id="rs-reason"
          label="Reason (shared with the customer)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Specialist A is unavailable that afternoon"
          className="min-h-[64px]"
        />
        {error && (
          <p className="text-xs text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary" loading={saving}>
            Reschedule
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}
