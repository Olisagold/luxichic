import React from 'react';
import Link from 'next/link';
import type { Order } from '@/types/order';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { paymentMethodLabel } from '@/components/orders/OrderDetailsView';
import { formatNaira } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/dates';

export function OrderHistoryTable({ orders }: { orders: Order[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-[24px] bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-subtle">
            <tr>
              <th scope="col" className="px-6 py-4 font-semibold">
                Order
              </th>
              <th scope="col" className="px-4 py-4 font-semibold">
                Date
              </th>
              <th scope="col" className="px-4 py-4 font-semibold">
                Total
              </th>
              <th scope="col" className="px-4 py-4 font-semibold">
                Payment
              </th>
              <th scope="col" className="px-4 py-4 font-semibold">
                Status
              </th>
              <th scope="col" className="px-6 py-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.orderNumber}>
                <td className="px-6 py-4 font-semibold text-ink">{o.orderNumber}</td>
                <td className="px-4 py-4 text-charcoal">{formatDate(o.createdAt)}</td>
                <td className="px-4 py-4 tabular-nums text-ink">{formatNaira(o.total)}</td>
                <td className="px-4 py-4">
                  <p className="text-charcoal">{paymentMethodLabel(o.paymentMethod)}</p>
                  <StatusBadge status={o.paymentStatus} className="mt-1" />
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/account/orders/${o.orderNumber}`}
                    className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.14em] text-ink underline-offset-4 hover:underline"
                  >
                    View details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {orders.map((o) => (
          <li key={o.orderNumber}>
            <Link href={`/account/orders/${o.orderNumber}`} className="block rounded-2xl bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">{o.orderNumber}</p>
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-1 text-sm text-subtle">
                {formatDate(o.createdAt)} · {o.items.length} item{o.items.length > 1 ? 's' : ''}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-charcoal">
                  {paymentMethodLabel(o.paymentMethod)} · {o.paymentStatus}
                </span>
                <span className="font-semibold tabular-nums">{formatNaira(o.total)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
