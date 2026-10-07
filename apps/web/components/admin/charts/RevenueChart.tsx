'use client';

import React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compactNaira } from '@/lib/utils/adminAnalytics';
import { formatNaira } from '@/lib/utils/currency';

interface Point {
  label: string;
  revenue: number;
  orders: number;
}

const axis = { fontSize: 11, fill: '#88838A' };

export function RevenueChart({ data, metric = 'revenue', height = 260 }: {data: Point[];metric?: 'revenue' | 'orders';height?: number;}) {
  const isRevenue = metric === 'revenue';
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {isRevenue ?
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#EFEAE6" vertical={false} />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={52} tickFormatter={compactNaira} />
            <Tooltip
            cursor={{ stroke: '#0A0A0A', strokeOpacity: 0.15 }}
            contentStyle={{ borderRadius: 10, border: '1px solid #E9E3DE', fontSize: 12 }}
            formatter={(v: number) => [formatNaira(v), 'Revenue']} />
          
            <Area type="monotone" dataKey="revenue" stroke="#F0288C" strokeWidth={2} fill="#F0288C" fillOpacity={0.08} />
          </AreaChart> :

        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#EFEAE6" vertical={false} />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <Tooltip cursor={{ fill: '#F5F4F3' }} contentStyle={{ borderRadius: 10, border: '1px solid #E9E3DE', fontSize: 12 }} formatter={(v: number) => [v, 'Orders']} />
            <Bar dataKey="orders" fill="#0A0A0A" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        }
      </ResponsiveContainer>
    </div>);

}