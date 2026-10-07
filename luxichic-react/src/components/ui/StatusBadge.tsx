import React from 'react';
import { cn } from '../../utils/cn';

const amber = 'bg-amber-50 text-amber-800 ring-amber-200';
const green = 'bg-emerald-50 text-emerald-800 ring-emerald-200';
const red = 'bg-red-50 text-red-800 ring-red-200';
const neutral = 'bg-ivory text-charcoal ring-line';

const styles: Record<string, string> = {
  Pending: amber,
  'Pending Verification': amber,
  'Low Stock': amber,
  Draft: neutral,
  Confirmed: 'bg-sky-50 text-sky-800 ring-sky-200',
  Rescheduled: 'bg-violet-50 text-violet-800 ring-violet-200',
  Processing: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  Shipped: 'bg-violet-50 text-violet-800 ring-violet-200',
  Delivered: green,
  Completed: green,
  'Payment Confirmed': green,
  Paid: green,
  Published: green,
  Active: green,
  Visible: green,
  'In Stock': green,
  Connected: green,
  'Pay on Delivery': neutral,
  Archived: neutral,
  Hidden: neutral,
  'On Leave': amber,
  Scheduled: amber,
  Expired: neutral,
  'Used up': neutral,
  Inactive: neutral,
  Guest: neutral,
  Disconnected: neutral,
  Suspended: red,
  Cancelled: red,
  Rejected: red,
  Blocked: red,
  Error: red,
  'Out of Stock': red
};

export function StatusBadge({ status, className }: {status: string;className?: string;}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors duration-200',
        styles[status] ?? neutral,
        className
      )}>
      
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {status}
    </span>);

}