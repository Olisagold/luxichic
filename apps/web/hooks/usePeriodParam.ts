'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Period } from '@/lib/analytics/types';
import type { RangeKey } from '@/lib/utils/adminAnalytics';

/**
 * The dashboard/analytics date range, kept in the URL so the server computes the figures for it. A custom range
 * applies once both dates are chosen; until then the previous figures stay on screen.
 */
export function usePeriodParam(period: Period) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [range, setRangeState] = useState<RangeKey>(period.key);
  const [custom, setCustomState] = useState(
    period.key === 'custom' ? { from: period.from, to: period.to } : { from: '', to: '' },
  );

  const go = (query: string) => startTransition(() => router.replace(`${pathname}?${query}`, { scroll: false }));

  const setRange = (key: RangeKey) => {
    setRangeState(key);
    if (key !== 'custom') go(`range=${key}`);
    else if (custom.from && custom.to) go(`range=custom&from=${custom.from}&to=${custom.to}`);
  };

  const setCustom = (c: { from: string; to: string }) => {
    setCustomState(c);
    if (c.from && c.to && c.from <= c.to) go(`range=custom&from=${c.from}&to=${c.to}`);
  };

  return { range, setRange, custom, setCustom, pending };
}
