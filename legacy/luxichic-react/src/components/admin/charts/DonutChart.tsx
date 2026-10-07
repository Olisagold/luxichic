import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface Slice {
  name: string;
  value: number;
  color: string;
}

export function DonutChart({ data, format = (n: number) => String(n), centerLabel }: {data: Slice[];format?: (n: number) => string;centerLabel?: string;}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={72} paddingAngle={2} stroke="none">
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E9E3DE', fontSize: 12 }} formatter={(v: number) => format(v)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-ink">{format(total)}</span>
          {centerLabel && <span className="text-[10px] text-subtle">{centerLabel}</span>}
        </div>
      </div>
      <ul className="w-full space-y-2">
        {data.map((d) =>
        <li key={d.name} className="flex items-center gap-2 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-charcoal">{d.name}</span>
            <span className="font-semibold tabular-nums text-ink">{format(d.value)}</span>
            <span className="w-9 text-right text-xs tabular-nums text-subtle">{total ? Math.round(d.value / total * 100) : 0}%</span>
          </li>
        )}
      </ul>
    </div>);

}