'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { DownloadIcon, HistoryIcon } from 'lucide-react';
import type { ActivitySection } from '@/types/admin';
import { useDb } from '@/lib/mock-db/db';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { adminInputClass } from '@/components/admin/ui/AdminField';
import { TablePager, paginate } from '@/components/admin/ui/TablePager';
import { formatDateTime } from '@/lib/utils/dates';
import { downloadCsv } from '@/lib/utils/text';
import { cn } from '@/lib/utils/cn';

const PAGE = 30;

export function ActivityLogs() {
  const activity = useDb((s) => s.activity);
  const admins = useDb((s) => s.admins);
  const [q, setQ] = useState('');
  const [section, setSection] = useState<'' | ActivitySection>('');
  const [adminId, setAdminId] = useState('');
  const [from, setFrom] = useState('');
  const [page, setPage] = useState(1);

  const sections = Array.from(new Set(activity.map((a) => a.section))).sort();
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return activity
      .filter((a) => !section || a.section === section)
      .filter((a) => !adminId || a.adminId === adminId)
      .filter((a) => !from || a.at.slice(0, 10) >= from)
      .filter((a) => !t || [a.action, a.target ?? '', a.adminName].some((f) => f.toLowerCase().includes(t)))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [activity, q, section, adminId, from]);

  const exportCsv = () => {
    downloadCsv('luxichic-activity-log.csv', [
      ['Date', 'Admin', 'Section', 'Action', 'Details'],
      ...filtered.map((a) => [formatDateTime(a.at), a.adminName, a.section, a.action, a.target ?? '']),
    ]);
    toast.success('Activity log exported');
  };

  return (
    <div>
      <PageHeader
        title="Activity logs"
        description="Every change made in the dashboard, who made it and when. Entries can’t be edited."
        actions={
          <AdminButton icon={<DownloadIcon className="h-4 w-4" />} onClick={exportCsv}>
            Export
          </AdminButton>
        }
      />
      <div className="rounded-xl border border-line bg-white">
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:p-4 lg:flex-row">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search actions or details"
            className="lg:max-w-xs lg:flex-1"
          />
          <select
            aria-label="Section"
            value={section}
            onChange={(e) => {
              setSection(e.target.value as ActivitySection | '');
              setPage(1);
            }}
            className={cn(adminInputClass, 'lg:w-44')}
          >
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            aria-label="Admin"
            value={adminId}
            onChange={(e) => {
              setAdminId(e.target.value);
              setPage(1);
            }}
            className={cn(adminInputClass, 'lg:w-48')}
          >
            <option value="">All admins</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="From date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className={cn(adminInputClass, 'lg:w-40')}
          />
        </div>
        {filtered.length === 0 ? (
          <AdminEmpty icon={<HistoryIcon className="h-5 w-5" />} title="No activity found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead className="border-b border-line text-xs text-subtle">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">When</th>
                    <th className="px-2 py-2.5 font-semibold">Admin</th>
                    <th className="px-2 py-2.5 font-semibold">Section</th>
                    <th className="px-4 py-2.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginate(filtered, page, PAGE).map((a) => (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-subtle">{formatDateTime(a.at)}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 font-medium text-ink">{a.adminName}</td>
                      <td className="px-2 py-2.5">
                        <span className="rounded bg-canvas px-1.5 py-0.5 text-[11px] font-semibold text-charcoal">
                          {a.section}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-charcoal">
                        <span className="text-ink">{a.action}</span>
                        {a.target &&
                          (a.link ? (
                            <Link
                              href={a.link}
                              className="ml-1.5 text-subtle underline-offset-2 hover:text-ink hover:underline"
                            >
                              {a.target}
                            </Link>
                          ) : (
                            <span className="ml-1.5 text-subtle">{a.target}</span>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePager page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
