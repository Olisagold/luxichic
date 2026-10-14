'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DownloadIcon, MailIcon, Trash2Icon } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { removeSubscriber } from '@/lib/newsletter/admin';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { TablePager, paginate } from '@/components/admin/ui/TablePager';
import { formatDateTime } from '@/lib/utils/dates';
import { downloadCsv } from '@/lib/utils/text';

export interface Subscriber {
  id: string;
  email: string;
  source: string;
  subscribedAt: string;
}

const PAGE = 50;

/** Newsletter sign-ups from the homepage. There's no email marketing tool yet: export the list to use one. */
export function Newsletter({ subscribers }: { subscribers: Subscriber[] }) {
  const router = useRouter();
  const { can } = useAdminAuth();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<Subscriber | null>(null);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? subscribers.filter((x) => x.email.includes(t)) : subscribers;
  }, [q, subscribers]);

  const exportCsv = () => {
    downloadCsv(`luxichic-newsletter-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Email', 'Signed up', 'Source'],
      ...subscribers.map((x) => [x.email, x.subscribedAt.slice(0, 10), x.source]),
    ]);
    toast.success(`Exported ${subscribers.length} subscriber${subscribers.length === 1 ? '' : 's'}`);
  };

  const remove = async () => {
    if (!removing) return;
    const res = await removeSubscriber(removing.id).catch(() => null);
    setRemoving(null);
    if (!res?.ok) return toast.error(res?.error ?? 'Could not remove the subscriber.');
    toast.success('Subscriber removed');
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        title="Newsletter"
        description={`${subscribers.length} subscriber${subscribers.length === 1 ? '' : 's'} from the homepage sign-up form.`}
        actions={
          <AdminButton icon={<DownloadIcon className="h-4 w-4" />} onClick={exportCsv} disabled={!subscribers.length}>
            Export CSV
          </AdminButton>
        }
      />
      <div className="rounded-xl border border-line bg-white">
        <div className="border-b border-line p-3 sm:p-4">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search by email"
            className="max-w-sm"
          />
        </div>
        {shown.length === 0 ? (
          <AdminEmpty
            icon={<MailIcon className="h-5 w-5" />}
            title={subscribers.length ? 'No matches' : 'No subscribers yet'}
            text={subscribers.length ? undefined : 'Sign-ups from the homepage newsletter form appear here.'}
          />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {paginate(shown, page, PAGE).map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{x.email}</span>
                  <span className="hidden shrink-0 text-xs text-subtle sm:block">{x.source}</span>
                  <span className="shrink-0 text-xs text-subtle">{formatDateTime(x.subscribedAt)}</span>
                  {can('customers.edit') && (
                    <button
                      onClick={() => setRemoving(x)}
                      className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remove ${x.email}`}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <TablePager page={page} pageSize={PAGE} total={shown.length} onChange={setPage} />
          </>
        )}
      </div>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        title="Remove this subscriber?"
        tone="danger"
        confirmLabel="Remove"
        message={`${removing?.email ?? ''} is taken off the list. They can sign up again from the homepage.`}
      />
    </div>
  );
}
