'use client';

import React, { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import type { Division, Product, ProductFilterState } from '@/types/product';
import { toolCategories } from '@/data/categories';
import { uniqueValues } from '@/lib/utils/products';
import { cn } from '@/lib/utils/cn';

interface ProductFiltersProps {
  division: Division;
  products: Product[];
  filters: ProductFilterState;
  onChange: (f: ProductFilterState) => void;
}

type ListKey = 'construction' | 'texture' | 'origin' | 'laceType' | 'category' | 'brand' | 'features';

const priceRanges: Record<Division, { label: string; min: number | null; max: number | null }[]> = {
  hairs: [
    { label: 'Under ₦100,000', min: null, max: 99999 },
    { label: '₦100,000 – ₦150,000', min: 100000, max: 150000 },
    { label: '₦150,000 – ₦250,000', min: 150001, max: 250000 },
    { label: 'Over ₦250,000', min: 250001, max: null },
  ],

  tools: [
    { label: 'Under ₦10,000', min: null, max: 9999 },
    { label: '₦10,000 – ₦30,000', min: 10000, max: 30000 },
    { label: '₦30,000 – ₦100,000', min: 30001, max: 100000 },
    { label: 'Over ₦100,000', min: 100001, max: null },
  ],
};

export function ProductFilters({ division, products, filters, onChange }: ProductFiltersProps) {
  const toolCatNames = new Map(toolCategories.map((c) => [c.slug, c.name]));
  const toolSubs = new Set(toolCategories.filter((c) => !['Shop', 'Departments'].includes(c.group)).map((c) => c.slug));

  const groups: { key: ListKey; title: string; options: { value: string; label: string; count: number }[] }[] =
    division === 'hairs'
      ? [
          {
            key: 'construction',
            title: 'Wig Construction',
            options: uniqueValues(products, (p) => p.attributes.construction).map((o) => ({ ...o, label: o.value })),
          },
          {
            key: 'texture',
            title: 'Hair Texture',
            options: uniqueValues(products, (p) => p.attributes.texture).map((o) => ({ ...o, label: o.value })),
          },
          {
            key: 'origin',
            title: 'Hair Type / Origin',
            options: uniqueValues(products, (p) => p.attributes.origin).map((o) => ({ ...o, label: o.value })),
          },
          {
            key: 'laceType',
            title: 'Lace Type',
            options: uniqueValues(products, (p) => p.attributes.laceType).map((o) => ({ ...o, label: o.value })),
          },
        ]
      : [
          {
            key: 'category',
            title: 'Category',
            options: uniqueValues(products, (p) => p.categories.filter((c) => toolSubs.has(c))).map((o) => ({
              ...o,
              label: toolCatNames.get(o.value) ?? o.value,
            })),
          },
          {
            key: 'brand',
            title: 'Brand',
            options: uniqueValues(products, (p) => p.attributes.brand).map((o) => ({ ...o, label: o.value })),
          },
          {
            key: 'features',
            title: 'Specifications',
            options: uniqueValues(products, (p) => p.attributes.features).map((o) => ({ ...o, label: o.value })),
          },
        ];

  const lengths = Array.from(new Set(products.flatMap((p) => p.attributes.lengths ?? []))).sort((a, b) => a - b);

  const toggle = (key: ListKey, value: string) => {
    const list = filters[key];
    onChange({ ...filters, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  };

  return (
    <div className="divide-y divide-line border-y border-line">
      {groups
        .filter((g) => g.options.length > 0)
        .map((g) => (
          <FilterSection key={g.key} title={g.title} count={filters[g.key].length}>
            <ul className="space-y-2.5">
              {g.options.map((o) => (
                <li key={o.value}>
                  <label className="flex cursor-pointer items-center gap-3 text-sm text-charcoal">
                    <input
                      type="checkbox"
                      checked={filters[g.key].includes(o.value)}
                      onChange={() => toggle(g.key, o.value)}
                      className="h-4 w-4 rounded border-line accent-ink"
                    />

                    <span className="flex-1">{o.label}</span>
                    <span className="text-xs tabular-nums text-subtle">{o.count}</span>
                  </label>
                </li>
              ))}
            </ul>
          </FilterSection>
        ))}

      {division === 'hairs' && lengths.length > 0 && (
        <FilterSection title="Hair Length" count={filters.lengths.length}>
          <div className="flex flex-wrap gap-2">
            {lengths.map((l) => {
              const active = filters.lengths.includes(l);
              return (
                <button
                  key={l}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onChange({
                      ...filters,
                      lengths: active ? filters.lengths.filter((x) => x !== l) : [...filters.lengths, l],
                    })
                  }
                  className={cn(
                    'h-9 min-w-[3rem] rounded-full border px-3 text-xs font-medium tabular-nums transition-colors duration-150',
                    active ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink',
                  )}
                >
                  {`${l}"`}
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Price" count={filters.minPrice !== null || filters.maxPrice !== null ? 1 : 0}>
        <ul className="space-y-2.5">
          {priceRanges[division].map((r) => {
            const active = filters.minPrice === r.min && filters.maxPrice === r.max;
            return (
              <li key={r.label}>
                <label className="flex cursor-pointer items-center gap-3 text-sm text-charcoal">
                  <input
                    type="radio"
                    name={`price-${division}`}
                    checked={active}
                    onChange={() => onChange({ ...filters, minPrice: r.min, maxPrice: r.max })}
                    className="h-4 w-4 accent-ink"
                  />

                  {r.label}
                </label>
              </li>
            );
          })}
        </ul>
        {(filters.minPrice !== null || filters.maxPrice !== null) && (
          <button
            className="mt-3 text-xs font-semibold text-pink-deep underline-offset-4 hover:underline"
            onClick={() => onChange({ ...filters, minPrice: null, maxPrice: null })}
          >
            Clear price
          </button>
        )}
      </FilterSection>

      <FilterSection title="Rating" count={filters.minRating > 0 ? 1 : 0}>
        <div className="flex flex-wrap gap-2">
          {[0, 4, 4.5].map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={filters.minRating === r}
              onClick={() => onChange({ ...filters, minRating: r })}
              className={cn(
                'h-9 rounded-full border px-4 text-xs font-medium transition-colors duration-150',
                filters.minRating === r ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink',
              )}
            >
              {r === 0 ? 'Any' : `${r}★ & up`}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Availability & Offers"
        count={(filters.inStockOnly ? 1 : 0) + (filters.discountedOnly ? 1 : 0)}
      >
        <div className="space-y-3">
          <Toggle
            label="In stock only"
            checked={filters.inStockOnly}
            onChange={(v) => onChange({ ...filters, inStockOnly: v })}
          />
          <Toggle
            label="Discounted only"
            checked={filters.discountedOnly}
            onChange={(v) => onChange({ ...filters, discountedOnly: v })}
          />
        </div>
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="py-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-sm font-semibold text-ink"
      >
        <span>
          {title}
          {count > 0 && (
            <span className="ml-2 rounded-full bg-blush px-2 py-0.5 text-[11px] text-pink-deep">{count}</span>
          )}
        </span>
        <ChevronDownIcon
          className={cn('h-4 w-4 transition-transform duration-200 ease-lux', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-sm text-charcoal">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 rounded-full transition-colors duration-200', checked ? 'bg-ink' : 'bg-line')}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-lux',
            checked && 'translate-x-5',
          )}
        />
        <span className="sr-only">{label}</span>
      </button>
    </label>
  );
}
