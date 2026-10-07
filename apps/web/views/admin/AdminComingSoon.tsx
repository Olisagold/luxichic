'use client';

import React from 'react';
import { CompassIcon } from 'lucide-react';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { AdminButton } from '@/components/admin/ui/AdminButton';

/** Fallback for unknown admin URLs. */
export function AdminComingSoon() {
  return (
    <div className="rounded-xl border border-line bg-white">
      <AdminEmpty
        icon={<CompassIcon className="h-5 w-5" />}
        title="This admin page doesn’t exist"
        text="Check the address, or use the sidebar to find what you need."
        action={
          <AdminButton to="/admin/dashboard" variant="primary">
            Back to dashboard
          </AdminButton>
        }
      />
    </div>
  );
}
