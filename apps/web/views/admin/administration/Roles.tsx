'use client';

import React, { useState } from 'react';
import { useDb } from '@/lib/mock-db/db';
import { permissionGroups, rolePresets } from '@/data/adminSeed';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { PermissionMatrix } from '@/components/admin/PermissionMatrix';
import { cn } from '@/lib/utils/cn';

type Preset = keyof typeof rolePresets;
const descriptions: Record<Preset, string> = {
  'Super Admin': 'Everything, including admin users and settings.',
  'Order Manager': 'Confirms payments and moves orders through delivery.',
  'Product Manager': 'Adds and edits products, stock, categories and promo codes.',
  'Salon Manager': 'Runs appointments, services, specialists and availability.',
  'Content Manager': 'Edits the homepage, pages and media library.',
  'Customer Support': 'Helps customers, moderates reviews and views orders.',
};

/** Role presets are starting points. Each admin’s permissions can be adjusted individually. */
export function Roles() {
  const admins = useDb((s) => s.admins);
  const presets = Object.keys(rolePresets) as Preset[];
  const [active, setActive] = useState<Preset>('Order Manager');
  const total = permissionGroups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div>
      <PageHeader
        title="Roles & permissions"
        description="Roles are templates. When you add an admin, pick a role and then switch individual permissions on or off."
        actions={
          <AdminButton variant="primary" to="/admin/admin-users">
            Manage admin users
          </AdminButton>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <ul className="space-y-1.5 lg:self-start">
          {presets.map((r) => {
            const count = admins.filter((a) => a.role === r).length;
            return (
              <li key={r}>
                <button
                  onClick={() => setActive(r)}
                  aria-current={active === r}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-left transition-colors duration-150',
                    active === r ? 'border-ink bg-white' : 'border-transparent hover:bg-white',
                  )}
                >
                  <span className="flex items-center justify-between text-[13px] font-semibold text-ink">
                    {r}
                    <span className="text-[11px] font-normal text-subtle">
                      {count} admin{count === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-subtle">{descriptions[r]}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <Panel title={active} description={`${rolePresets[active].length} of ${total} permissions`}>
          <PermissionMatrix value={rolePresets[active]} disabled />
          <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-xs text-subtle">
            Permissions are checked in this prototype to show the experience. The backend must enforce them on every
            request.
          </p>
        </Panel>
      </div>
    </div>
  );
}
