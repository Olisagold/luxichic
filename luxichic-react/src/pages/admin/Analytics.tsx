import React, { useMemo, useState } from 'react';
import { ArrowDownRightIcon, ArrowUpRightIcon, DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useOrders } from '../../contexts/OrdersContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { Panel } from '../../components/admin/ui/Panel';
import { AdminButton } from '../../components/admin/ui/AdminButton';
import { RangePicker } from '../../components/admin/ui/RangePicker';
import { RevenueChart } from '../../components/admin/charts/RevenueChart';
import { DonutChart } from '../../components/admin/charts/DonutChart';
import { compactNaira, countsAsRevenue, inRange, pctChange, previousRange, resolveRange, revenueSeries, salesByDivision, topProducts, type RangeKey } from '../../utils/adminAnalytics';
import { formatNaira } from '../../utils/currency';
import { downloadCsv } from '../../utils/text';
import { cn } from '../../utils/cn';

export function Analytics() {
  const { orders, appointments } = useOrders();
  const { users } = useAuth();
  const [range, setRange] = useState<RangeKey>('30d');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');

  const r = useMemo(() => resolveRange(range, custom), [range, custom]);
  const prev = useMemo(() => previousRange(r), [r]);

  const data = useMemo(() => {
    const cur = orders.filter((o) => inRange(o.createdAt, r));
    const before = orders.filter((o) => inRange(o.createdAt, prev));
    const rev = (l: typeof cur) => l.filter(countsAsRevenue).reduce((s, o) => s + o.total, 0);
    const paid = (l: typeof cur) => l.filter(countsAsRevenue);
    const appts = appointments.filter((a) => inRange(a.createdAt, r));
    const apptsPrev = appointments.filter((a) => inRange(a.createdAt, prev));
    const signups = users.filter((u) => inRange(u.createdAt, r)).length;
    const signupsPrev = users.filter((u) => inRange(u.createdAt, prev)).length;
    const revenue = rev(cur);
    const aov = paid(cur).length ? Math.round(revenue / paid(cur).length) : 0;
    const aovPrev = paid(before).length ? Math.round(rev(before) / paid(before).length) : 0;
    const byService = Object.entries(appts.reduce<Record<string, number>>((m, a) => ({ ...m, [a.serviceName]: (m[a.serviceName] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
    const statuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => ({ s, n: cur.filter((o) => o.status === s).length }));
    const methods = [
    { name: 'Bank transfer', value: cur.filter((o) => o.paymentMethod === 'bank_transfer').length, color: '#0A0A0A' },
    { name: 'Pay on Delivery', value: cur.filter((o) => o.paymentMethod === 'pay_on_delivery').length, color: '#F0288C' }];

    const states = Object.entries(cur.reduce<Record<string, number>>((m, o) => ({ ...m, [o.address.state]: (m[o.address.state] ?? 0) + o.total }), {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      cur, revenue, aov, signups, byService, statuses, methods, states,
      kpis: [
      { label: 'Revenue', value: formatNaira(revenue), change: pctChange(revenue, rev(before)) },
      { label: 'Orders', value: String(cur.length), change: pctChange(cur.length, before.length) },
      { label: 'Average order', value: aov ? formatNaira(aov) : '—', change: pctChange(aov, aovPrev) },
      { label: 'Appointments', value: String(appts.length), change: pctChange(appts.length, apptsPrev.length) },
      { label: 'New accounts', value: String(signups), change: pctChange(signups, signupsPrev) }]

    };
  }, [orders, appointments, users, r, prev]);

  const series = useMemo(() => revenueSeries(orders, r), [orders, r]);
  const top = useMemo(() => topProducts(data.cur, 8), [data.cur]);
  const split = useMemo(() => salesByDivision(data.cur), [data.cur]);
  const maxService = Math.max(1, ...data.byService.map(([, n]) => n));
  const maxState = Math.max(1, ...data.states.map(([, n]) => n));

  const exportCsv = () => {
    downloadCsv(`luxichic-sales-${range}.csv`, [['Period', 'Revenue (NGN)', 'Orders'], ...series.map((p) => [p.label, p.revenue, p.orders])]);
    toast.success('Report exported');
  };

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="How the stores and salon are performing, compared with the previous period."
        actions={<AdminButton icon={<DownloadIcon className="h-4 w-4" />} onClick={exportCsv}>Export</AdminButton>} />
      
      <div className="mb-5"><RangePicker value={range} onChange={setRange} custom={custom} onCustom={setCustom} /></div>

      <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-5">
        {data.kpis.map((k, i) =>
        <div key={k.label} className={cn('bg-white px-4 py-3.5', i === 0 && 'col-span-2 md:col-span-1')}>
            <dt className="text-xs text-subtle">{k.label}</dt>
            <dd className={cn('mt-0.5 font-bold tabular-nums text-ink', i === 0 ? 'text-2xl' : 'text-xl')}>{k.value}</dd>
            {k.change !== null ?
          <p className={cn('mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold', k.change >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                {k.change >= 0 ? <ArrowUpRightIcon className="h-3 w-3" aria-hidden /> : <ArrowDownRightIcon className="h-3 w-3" aria-hidden />}
                {Math.abs(k.change)}% vs previous
              </p> :
          <p className="mt-0.5 text-[11px] text-subtle">New this period</p>}
          </div>
        )}
      </dl>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title={metric === 'revenue' ? 'Revenue' : 'Orders'}
          actions={
          <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Chart metric">
              {(['revenue', 'orders'] as const).map((m) => <button key={m} onClick={() => setMetric(m)} aria-pressed={metric === m} className={cn('h-7 rounded-md px-2.5 text-xs font-semibold capitalize', metric === m ? 'bg-ink text-white' : 'text-charcoal hover:bg-canvas')}>{m}</button>)}
            </div>
          }>
          
          <RevenueChart data={series} metric={metric} height={300} />
        </Panel>
        <Panel title="Sales by store"><DonutChart data={split} format={compactNaira} centerLabel="revenue" /></Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Best-selling products" bodyClassName="p-0" className="xl:col-span-2">
          {top.length === 0 ? <p className="px-5 py-6 text-[13px] text-subtle">No sales in this period.</p> :
          <table className="w-full text-[13px]">
              <thead className="border-b border-line text-xs text-subtle"><tr><th className="px-5 py-2 text-left font-semibold">Product</th><th className="px-2 py-2 text-right font-semibold">Units</th><th className="px-5 py-2 text-right font-semibold">Revenue</th></tr></thead>
              <tbody className="divide-y divide-line">
                {top.map((p) =>
              <tr key={p.productId}>
                    <td className="px-5 py-2"><span className="flex items-center gap-2.5"><img src={p.image} alt="" className="h-8 w-8 rounded object-cover" /><span className="truncate font-medium text-ink">{p.name}</span></span></td>
                    <td className="px-2 py-2 text-right tabular-nums text-charcoal">{p.qty}</td>
                    <td className="px-5 py-2 text-right font-semibold tabular-nums text-ink">{formatNaira(p.revenue)}</td>
                  </tr>
              )}
              </tbody>
            </table>
          }
        </Panel>
        <Panel title="Payment methods"><DonutChart data={data.methods} centerLabel="orders" /></Panel>
        <Panel title="Most-booked services">
          {data.byService.length === 0 ? <p className="text-[13px] text-subtle">No bookings in this period.</p> :
          <ul className="space-y-2.5">
              {data.byService.slice(0, 6).map(([name, n]) =>
            <li key={name} className="text-[13px]">
                  <div className="flex justify-between"><span className="text-ink">{name}</span><span className="tabular-nums text-subtle">{n}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-canvas"><div className="h-full rounded-full bg-ink" style={{ width: `${n / maxService * 100}%` }} /></div>
                </li>
            )}
            </ul>
          }
        </Panel>
        <Panel title="Revenue by state">
          {data.states.length === 0 ? <p className="text-[13px] text-subtle">No orders in this period.</p> :
          <ul className="space-y-2.5">
              {data.states.map(([state, n]) =>
            <li key={state} className="text-[13px]">
                  <div className="flex justify-between"><span className="text-ink">{state}</span><span className="tabular-nums text-subtle">{compactNaira(n)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-canvas"><div className="h-full rounded-full bg-pink" style={{ width: `${n / maxState * 100}%` }} /></div>
                </li>
            )}
            </ul>
          }
        </Panel>
        <Panel title="Orders by status">
          <ul className="space-y-1.5 text-[13px]">
            {data.statuses.map(({ s, n }) =>
            <li key={s} className="flex justify-between"><span className="text-charcoal">{s}</span><span className="font-semibold tabular-nums text-ink">{n}</span></li>
            )}
          </ul>
        </Panel>
      </div>
    </div>);

}