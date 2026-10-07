'use client';

import React from 'react';
import type { ProductEditorState } from '@/hooks/useProductEditor';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Panel } from '@/components/admin/ui/Panel';
import { Toggle } from '@/components/admin/ui/Toggle';
import { cn } from '@/lib/utils/cn';

const statuses = [
  { value: 'draft', label: 'Draft', text: 'Hidden from customers' },
  { value: 'published', label: 'Published', text: 'Visible on the store' },
  { value: 'archived', label: 'Archived', text: 'Hidden, history kept' },
] as const;

export function StatusSection({ editor }: { editor: ProductEditorState }) {
  const { draft, update } = editor;
  const { can } = useAdminAuth();
  return (
    <Panel title="Status & placement">
      <div className="space-y-1.5" role="radiogroup" aria-label="Product status">
        {statuses.map((s) => {
          const disabled = s.value === 'archived' && !can('products.archive');
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={draft.status === s.value}
              disabled={disabled}
              onClick={() => update({ status: s.value })}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors duration-150 disabled:opacity-40',
                draft.status === s.value ? 'border-ink bg-canvas/60' : 'border-line hover:border-ink/30',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full border',
                  draft.status === s.value ? 'border-ink' : 'border-line',
                )}
              >
                {draft.status === s.value && <span className="h-2 w-2 rounded-full bg-ink" />}
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-ink">{s.label}</span>
                <span className="block text-xs text-subtle">{s.text}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-5 space-y-3.5 border-t border-line pt-4">
        <Toggle
          label="Featured product"
          description="Prioritised on the homepage and store pages."
          checked={draft.isFeatured}
          onChange={(v) => update({ isFeatured: v })}
        />
        <Toggle
          label="Bestseller"
          description="Appears in Bestsellers."
          checked={!!draft.isBestseller}
          onChange={(v) => update({ isBestseller: v })}
        />
        <Toggle
          label="New arrival"
          description="Appears in New Arrivals."
          checked={!!draft.isNew}
          onChange={(v) => update({ isNew: v })}
        />
        <Toggle
          label="Sale product"
          description="Appears in Discounted Products."
          checked={draft.isSale}
          onChange={(v) => update({ isSale: v })}
        />
      </div>
    </Panel>
  );
}
