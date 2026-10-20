'use client';

import React from 'react';
import { toast } from 'sonner';
import { BellRingIcon, SendIcon } from 'lucide-react';
import { usePush } from '@/hooks/usePush';
import { pushCopy } from '@/components/push/pushCopy';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';

/** Turns phone notifications on for the signed-in admin on this device: the same alerts as their bell. */
export function PushPanel() {
  const push = usePush('admin');
  const { status, busy } = push;

  const enable = async () => {
    const error = await push.enable();
    if (error) toast.error(error);
    else toast.success('Notifications are on', { description: 'Your alerts will come to this device.' });
  };
  const test = async () => {
    const res = await push.test().catch(() => null);
    if (!res?.ok) toast.error(res?.error ?? 'Could not send the test.');
    else toast.success('Test sent', { description: 'It should arrive in a few seconds.' });
  };

  return (
    <Panel title="Notifications on this device" description="The same alerts as your bell, on your phone or computer.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[13px] text-charcoal">{pushCopy(status, 'LUXICHIC Admin')}</p>
        <div className="flex gap-2">
          {status === 'off' && (
            <AdminButton variant="primary" icon={<BellRingIcon className="h-4 w-4" />} loading={busy} onClick={enable}>
              Turn on notifications
            </AdminButton>
          )}
          {status === 'on' && (
            <>
              <AdminButton icon={<SendIcon className="h-4 w-4" />} onClick={test}>
                Send a test
              </AdminButton>
              <AdminButton variant="ghost" loading={busy} onClick={() => push.disable()}>
                Turn off
              </AdminButton>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
