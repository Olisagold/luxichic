import React from 'react';
import { LockIcon } from 'lucide-react';
import type { Permission } from '../../types/admin';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { AdminEmpty } from './ui/AdminEmpty';
import { AdminButton } from './ui/AdminButton';

/** Hides a page the current admin can't access. UI-only — the server must enforce this too. */
export function RequirePermission({ permission, children }: {permission?: Permission;children: React.ReactNode;}) {
  const { can } = useAdminAuth();
  if (permission && !can(permission)) {
    return (
      <div className="rounded-xl border border-line bg-white">
        <AdminEmpty
          icon={<LockIcon className="h-5 w-5" />}
          title="You don’t have access to this section"
          text="Ask the main administrator to update your permissions."
          action={<AdminButton to="/admin/dashboard" variant="primary">Back to dashboard</AdminButton>} />
        
      </div>);

  }
  return <>{children}</>;
}