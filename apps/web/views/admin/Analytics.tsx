'use client';

import React, { useState } from 'react';
import { ArrowDownRightIcon, ArrowUpRightIcon, DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { usePeriodParam } from '@/hooks/usePeriodParam';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { RangePicker } from '@/components/admin/ui/RangePicker';
import { RevenueChart } from '@/components/admin/charts/RevenueChart';
import { DonutChart } from '@/components/admin/charts/DonutChart';
import { compactNaira } from '@/lib/utils/adminAnalytics';
import { formatNaira } from '@/lib/utils/currency';
import { downloadCsv } from '@/lib/utils/text';
import type { AnalyticsData } from '@/lib/analytics/types';
import { cn } from '@/lib/utils/cn';

/** Figures are aggregated on the server for the range in the URL (lib/analytics/admin-queries.ts). */
export function Analytics({ data }: { data: AnalyticsData }) {
  const { range, setRange, custom, setCustom, pending } = usePeriodParam(data.period);
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const { series, top, division: split, period } = data;
  const maxService = Math.max(1, ...data.byService.map(([, n]) => n));
  const maxState = Math.max(1, ...data.states.map(([, n]) => n));

  const exportCsv = () => {
    downloadCsv(`luxichic-sales-${period.from}-to-${period.to}.csv`, [
      ['Period', 'Revenue (NGN)', 'Orders'],
      ...series.map((p) => [p.label, p.revenue, p.orders]),
    ]);
    toast.success('Report exported');
  };

  return (
    <div className={cn('transition-opacity', pending && 'opacity-60')} aria-busy={pending}>
      <PageHeader
        title="Analytics"
        description="How the stores and salon are performing, compared with the previous period."
        actions={
          <AdminButton icon={<DownloadIcon className="h-4 w-4" />} onClick={exportCsv}>
            Export
          </AdminButton>
        }
      />

      <div className="mb-5">
        <RangePicker value={range} onChange={setRange} custom={custom} onCustom={setCustom} />
      </div>

      <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-5">
        {data.kpis.map((k, i) => (
          <div key={k.label} className={cn('bg-white px-4 py-3.5', i === 0 && 'col-span-2 md:col-span-1')}>
            <dt className="text-xs text-subtle">{k.label}</dt>
            <dd className={cn('mt-0.5 font-bold tabular-nums text-ink', i === 0 ? 'text-2xl' : 'text-xl')}>
              {k.value}
            </dd>
            {k.change !== null ? (
              <p
                className={cn(
                  'mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold',
                  k.change >= 0 ? 'text-emerald-700' : 'text-red-700',
                )}
              >
                {k.change >= 0 ? (
                  <ArrowUpRightIcon className="h-3 w-3" aria-hidden />
                ) : (
                  <ArrowDownRightIcon className="h-3 w-3" aria-hidden />
                )}
                {Math.abs(k.change)}% vs previous
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-subtle">New this period</p>
            )}
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title={metric === 'revenue' ? 'Revenue' : 'Orders'}
          actions={
            <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Chart metric">
              {(['revenue', 'orders'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  aria-pressed={metric === m}
                  className={cn(
                    'h-7 rounded-md px-2.5 text-xs font-semibold capitalize',
                    metric === m ? 'bg-ink text-white' : 'text-charcoal hover:bg-canvas',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          }
        >
          <RevenueChart data={series} metric={metric} height={300} />
        </Panel>
        <Panel title="Sales by store">
          <DonutChart data={split} format={compactNaira} centerLabel="revenue" />
        </Panel>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Best-selling products" bodyClassName="p-0" className="xl:col-span-2">
          {top.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No sales in this period.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="border-b border-line text-xs text-subtle">
                <tr>
                  <th className="px-5 py-2 text-left font-semibold">Product</th>
                  <th className="px-2 py-2 text-right font-semibold">Units</th>
                  <th className="px-5 py-2 text-right font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {top.map((p) => (
                  <tr key={p.productId ?? p.name}>
                    <td className="px-5 py-2">
                      <span className="flex items-center gap-2.5">
                        <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" />
                        <span className="truncate font-medium text-ink">{p.name}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-charcoal">{p.qty}</td>
                    <td className="px-5 py-2 text-right font-semibold tabular-nums text-ink">
                      {formatNaira(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Payment methods">
          <DonutChart data={data.methods} centerLabel="orders" />
        </Panel>
        <Panel title="Most-booked services">
          {data.byService.length === 0 ? (
            <p className="text-[13px] text-subtle">No bookings in this period.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.byService.slice(0, 6).map(([name, n]) => (
                <li key={name} className="text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-ink">{name}</span>
                    <span className="tabular-nums text-subtle">{n}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${(n / maxService) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Revenue by state">
          {data.states.length === 0 ? (
            <p className="text-[13px] text-subtle">No orders in this period.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.states.map(([state, n]) => (
                <li key={state} className="text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-ink">{state}</span>
                    <span className="tabular-nums text-subtle">{compactNaira(n)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-pink" style={{ width: `${(n / maxState) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Orders by status">
          <ul className="space-y-1.5 text-[13px]">
            {data.statuses.map(({ s, n }) => (
              <li key={s} className="flex justify-between">
                <span className="text-charcoal">{s}</span>
                <span className="font-semibold tabular-nums text-ink">{n}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
