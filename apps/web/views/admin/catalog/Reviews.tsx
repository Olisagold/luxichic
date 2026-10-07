'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArchiveIcon, EyeIcon, EyeOffIcon, MessageSquareIcon, TrashIcon } from 'lucide-react';
import type { Review } from '@/types/user';
import { useReviews } from '@/contexts/ReviewsContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAdminOps } from '@/hooks/useAdminOps';
import { useDb } from '@/lib/mock-db/db';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { FilterTabs } from '@/components/admin/ui/FilterTabs';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { TablePager, paginate } from '@/components/admin/ui/TablePager';
import { Stars } from '@/components/ui/Stars';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';

type Status = NonNullable<Review['status']>;
const label: Record<Status, string> = { visible: 'Visible', hidden: 'Hidden', archived: 'Archived' };
const PAGE = 12;

export function Reviews() {
  const { all } = useReviews();
  const { can } = useAdminAuth();
  const ops = useAdminOps();
  const products = useDb((s) => s.products);
  const [tab, setTab] = useState<Status>('visible');
  const [rating, setRating] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Review | null>(null);

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? 'Removed product';
  const status = (r: Review): Status => r.status ?? 'visible';

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all
      .filter((r) => status(r) === tab)
      .filter((r) => !rating || r.rating === rating)
      .filter(
        (r) => !t || [r.title, r.body, r.authorName, productName(r.productId)].some((f) => f.toLowerCase().includes(t)),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, tab, rating, q, products]);

  const avg = all.filter((r) => status(r) === 'visible');
  const average = avg.length ? (avg.reduce((s, r) => s + r.rating, 0) / avg.length).toFixed(1) : '—';
  const act = (r: Review, s: Status) => {
    ops.setReviewStatus(r.id, s);
    toast.success(
      s === 'visible' ? 'Review restored' : s === 'hidden' ? 'Review hidden from the store' : 'Review archived',
    );
  };

  return (
    <div>
      <PageHeader
        title="Reviews"
        description={`Average visible rating ${average} from ${avg.length} reviews. Hidden reviews never show on the store.`}
      />
      <div className="rounded-xl border border-line bg-white">
        <div className="space-y-3 border-b border-line p-3 sm:p-4">
          <FilterTabs
            label="Review status"
            value={tab}
            onChange={(v) => {
              setTab(v);
              setPage(1);
            }}
            options={(['visible', 'hidden', 'archived'] as Status[]).map((s) => ({
              value: s,
              label: label[s],
              count: all.filter((r) => status(r) === s).length,
            }))}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              value={q}
              onChange={(v) => {
                setQ(v);
                setPage(1);
              }}
              placeholder="Search reviews, customers or products"
              className="sm:max-w-sm sm:flex-1"
            />
            <div className="flex gap-1" role="group" aria-label="Filter by rating">
              {[0, 5, 4, 3, 2, 1].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setRating(n);
                    setPage(1);
                  }}
                  aria-pressed={rating === n}
                  className={cn(
                    'h-8 rounded-md border px-2.5 text-xs font-semibold',
                    rating === n ? 'border-ink bg-ink text-white' : 'border-line text-charcoal hover:border-ink/40',
                  )}
                >
                  {n === 0 ? 'All' : `${n}★`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <AdminEmpty
            icon={<MessageSquareIcon className="h-5 w-5" />}
            title={`No ${label[tab].toLowerCase()} reviews`}
            text="Nothing matches this view."
          />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {paginate(filtered, page, PAGE).map((r) => (
                <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars rating={r.rating} />
                      <StatusBadge status={label[status(r)]} />
                      {r.verified && (
                        <span className="text-[11px] font-semibold text-emerald-700">Verified purchase</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-ink">{r.title}</p>
                    <p className="mt-0.5 line-clamp-3 text-[13px] leading-relaxed text-charcoal">{r.body}</p>
                    {r.images && r.images.length > 0 && (
                      <div className="mt-2 flex gap-1.5">
                        {r.images.slice(0, 4).map((src) => (
                          <img key={src} src={src} alt="" className="h-12 w-12 rounded-md object-cover" />
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-subtle">
                      {r.authorName}
                      {r.authorEmail ? ` · ${r.authorEmail}` : ''} · {formatDate(r.date)} ·{' '}
                      <Link href={`/admin/products/${r.productId}`} className="font-medium text-ink hover:underline">
                        {productName(r.productId)}
                      </Link>
                    </p>
                  </div>
                  {can('reviews.moderate') && (
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {status(r) !== 'visible' && (
                        <AdminButton size="xs" icon={<EyeIcon className="h-3 w-3" />} onClick={() => act(r, 'visible')}>
                          Restore
                        </AdminButton>
                      )}
                      {status(r) === 'visible' && (
                        <AdminButton
                          size="xs"
                          icon={<EyeOffIcon className="h-3 w-3" />}
                          onClick={() => act(r, 'hidden')}
                        >
                          Hide
                        </AdminButton>
                      )}
                      {status(r) !== 'archived' && (
                        <AdminButton
                          size="xs"
                          icon={<ArchiveIcon className="h-3 w-3" />}
                          onClick={() => act(r, 'archived')}
                        >
                          Archive
                        </AdminButton>
                      )}
                      <AdminButton
                        size="xs"
                        variant="dangerGhost"
                        icon={<TrashIcon className="h-3 w-3" />}
                        onClick={() => setDeleting(r)}
                      >
                        Delete
                      </AdminButton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <TablePager page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
          </>
        )}
      </div>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) ops.deleteReview(deleting.id, deleting.title);
          setDeleting(null);
          toast.success('Review deleted');
        }}
        title="Delete this review permanently?"
        tone="danger"
        confirmLabel="Delete review"
        message="Hiding or archiving keeps a record. Deleting can’t be undone."
      />
    </div>
  );
}
