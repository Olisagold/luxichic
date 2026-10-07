import React from 'react';
import { CalendarIcon } from 'lucide-react';
import type { Appointment } from '@/types/salon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { findService } from '@/data/services';
import { businessConfig } from '@/data/config';
import { formatLongDate, formatSlot } from '@/lib/utils/dates';
import { appointmentMessage } from '@/lib/utils/whatsapp';

export function AppointmentList({ appointments, compact }: { appointments: Appointment[]; compact?: boolean }) {
  if (!appointments.length) {
    return (
      <EmptyState
        icon={<CalendarIcon className="h-7 w-7" />}
        title="No appointments yet"
        text="Book nails, lashes, braids, facials and more — pay only after your service."
        actions={<Button to="/salon/book">Book an appointment</Button>}
      />
    );
  }
  return (
    <ul className="divide-y divide-line rounded-[24px] bg-white px-6">
      {appointments.map((a) => {
        const service = findService(a.serviceSlug);
        return (
          <li key={a.reference} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
            {service && (
              <img src={service.image} alt="" className="h-16 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{a.serviceName}</p>
                <StatusBadge status={a.status} />
              </div>
              <p className="mt-1 text-sm text-charcoal">
                {formatLongDate(a.date)} · {formatSlot(a.time)}
              </p>
              <p className="text-xs text-subtle">
                Ref {a.reference} · {a.personnelName ?? 'Specialist to be assigned'}
              </p>
            </div>
            {!compact && (
              <WhatsAppButton
                number={service?.whatsapp ?? businessConfig.whatsapp.general}
                message={appointmentMessage(a)}
                label="WhatsApp"
                size="sm"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
