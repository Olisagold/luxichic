'use client';

import React from 'react';
import type { ProductEditorState } from '@/hooks/useProductEditor';
import { useDb } from '@/lib/mock-db/db';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminInput, AdminSelect, AdminTextarea } from '@/components/admin/ui/AdminField';
import { RichTextEditor } from '@/components/admin/ui/RichTextEditor';
import { cn } from '@/lib/utils/cn';

export function BasicsSection({ editor }: {editor: ProductEditorState;}) {
  const { draft, update, errors, isNew } = editor;
  const categories = useDb((s) => s.categories[draft.division]);
  const groups = Array.from(new Set(categories.map((c) => c.group)));

  const toggleCat = (slug: string) =>
  update({ categories: draft.categories.includes(slug) ? draft.categories.filter((c) => c !== slug) : [...draft.categories, slug] });

  return (
    <Panel title="Basic information" as="section">
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminInput id="p-name" label="Product name" value={draft.name} error={errors.name} onChange={(e) => update({ name: e.target.value })} wrapperClassName="sm:col-span-2" placeholder="e.g. Brazilian Bone Straight Wig" />
        <AdminInput id="p-sku" label="SKU" value={draft.sku} error={errors.sku} onChange={(e) => update({ sku: e.target.value.toUpperCase() })} placeholder="LX-H-024" />
        <AdminSelect
          id="p-division"
          label="Division"
          value={draft.division}
          disabled={!isNew}
          hint={isNew ? undefined : 'Division can’t change after creation.'}
          onChange={(e) => update({ division: e.target.value as typeof draft.division, categories: [] })}
          options={[{ value: 'hairs', label: 'LUXICHIC Hairs' }, { value: 'tools', label: 'Hair Tools, Salon Essentials & Braiding' }]} />
        
        <AdminInput id="p-slug" label="URL slug" optional value={draft.slug} onChange={(e) => update({ slug: e.target.value })} placeholder="Generated from the name" wrapperClassName="sm:col-span-2" />
      </div>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold text-charcoal">Categories &amp; subcategories</legend>
        {errors.categories && <p className="mt-1 text-xs text-red-700">{errors.categories}</p>}
        <div className="mt-2 space-y-3">
          {groups.map((g) =>
          <div key={g}>
              <p className="mb-1.5 text-[11px] font-semibold text-subtle">{g}</p>
              <div className="flex flex-wrap gap-1.5">
                {categories.filter((c) => c.group === g).map((c) => {
                const on = draft.categories.includes(c.slug);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleCat(c.slug)}
                    className={cn('h-7 rounded-md border px-2.5 text-xs font-medium transition-colors duration-150', on ? 'border-ink bg-ink text-white' : 'border-line text-charcoal hover:border-ink/40')}>
                    
                      {c.name}
                    </button>);

              })}
              </div>
            </div>
          )}
        </div>
      </fieldset>

      <div className="mt-5 space-y-4">
        <AdminTextarea id="p-short" label="Short description" value={draft.shortDescription} onChange={(e) => update({ shortDescription: e.target.value })} hint="Shown on product cards and under the title." className="min-h-[64px]" />
        <RichTextEditor id="p-desc" label="Full description" value={draft.description} onChange={(html) => update({ description: html })} />
        <div className="grid gap-4 lg:grid-cols-3">
          <RichTextEditor id="p-benefits" label="Benefits" value={draft.benefits ?? ''} onChange={(html) => update({ benefits: html })} minHeight={90} />
          <RichTextEditor id="p-usage" label="Usage instructions" value={draft.usage ?? ''} onChange={(html) => update({ usage: html })} minHeight={90} />
          <RichTextEditor id="p-care" label="Care instructions" value={draft.care ?? ''} onChange={(html) => update({ care: html })} minHeight={90} />
        </div>
      </div>
    </Panel>);

}