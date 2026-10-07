'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArchiveIcon,
  CopyIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from 'lucide-react';
import type { AdminProduct, ProductStatus } from '@/types/admin';
import type { Division } from '@/types/product';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useActor } from '@/hooks/useActor';
import { useDb } from '@/lib/mock-db/db';
import {
  deleteProducts,
  duplicateProduct,
  setProductCategory,
  setProductFlag,
  setProductStatus,
  stockState,
} from '@/lib/mock-db/catalog';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { FilterTabs } from '@/components/admin/ui/FilterTabs';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { TablePager, paginate } from '@/components/admin/ui/TablePager';
import { adminInputClass } from '@/components/admin/ui/AdminField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatNaira } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';

type Bulk = 'publish' | 'unpublish' | 'archive' | 'delete' | 'feature' | 'unfeature' | 'bestseller' | 'category';
const PAGE = 15;
const statusLabel: Record<ProductStatus, string> = { draft: 'Draft', published: 'Published', archived: 'Archived' };

export function Products() {
  const products = useDb((s) => s.products);
  const categories = useDb((s) => s.categories);
  const { can } = useAdminAuth();
  const actor = useActor();
  const router = useRouter();
  const [division, setDivision] = useState<'all' | Division>('all');
  const [status, setStatus] = useState<'all' | ProductStatus | 'oos'>('all');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState<Bulk | null>(null);
  const [bulkCategory, setBulkCategory] = useState('');
  const [single, setSingle] = useState<{ action: 'archive' | 'delete'; product: AdminProduct } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  useEffect(() => setPage(1), [division, status, category, q]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menu]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products
      .filter((p) => division === 'all' || p.division === division)
      .filter((p) =>
        status === 'all'
          ? p.status !== 'archived'
          : status === 'oos'
            ? p.trackInventory && p.stock <= 0
            : p.status === status,
      )
      .filter((p) => !category || p.categories.includes(category))
      .filter((p) => !t || p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [products, division, status, category, q]);

  const rows = paginate(filtered, page, PAGE);
  const allOnPage = rows.length > 0 && rows.every((p) => selected.includes(p.id));
  const catOptions = division === 'all' ? [...categories.hairs, ...categories.tools] : categories[division];

  const runBulk = () => {
    const ids = selected;
    switch (bulk) {
      case 'publish':
        setProductStatus(actor, ids, 'published');
        break;
      case 'unpublish':
        setProductStatus(actor, ids, 'draft');
        break;
      case 'archive':
        setProductStatus(actor, ids, 'archived');
        break;
      case 'delete':
        deleteProducts(actor, ids);
        break;
      case 'feature':
        setProductFlag(actor, ids, 'isFeatured', true);
        break;
      case 'unfeature':
        setProductFlag(actor, ids, 'isFeatured', false);
        break;
      case 'bestseller':
        setProductFlag(actor, ids, 'isBestseller', true);
        break;
      case 'category':
        if (bulkCategory) setProductCategory(actor, ids, bulkCategory);
        break;
    }
    toast.success(`Updated ${ids.length} product${ids.length > 1 ? 's' : ''}`);
    setSelected([]);
    setBulk(null);
  };

  const bulkLabels: Record<Bulk, string> = {
    publish: 'Publish',
    unpublish: 'Unpublish (set to draft)',
    archive: 'Archive',
    delete: 'Delete permanently',
    feature: 'Mark as featured',
    unfeature: 'Remove featured',
    bestseller: 'Mark as bestseller',
    category: 'Add to category',
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage products for LUXICHIC Hairs and Hair Tools & Essentials. Only published products appear on the storefront."
        actions={
          can('products.create') && (
            <AdminButton variant="primary" icon={<PlusIcon className="h-4 w-4" />} to="/admin/products/new">
              Add product
            </AdminButton>
          )
        }
      />

      <div className="rounded-xl border border-line bg-white">
        <div className="space-y-3 border-b border-line p-3 sm:p-4">
          <FilterTabs
            label="Division"
            value={division}
            onChange={(v) => {
              setDivision(v);
              setCategory('');
            }}
            options={[
              { value: 'all', label: 'All products', count: products.filter((p) => p.status !== 'archived').length },
              {
                value: 'hairs',
                label: 'LUXICHIC Hairs',
                count: products.filter((p) => p.division === 'hairs' && p.status !== 'archived').length,
              },
              {
                value: 'tools',
                label: 'Hair Tools & Essentials',
                count: products.filter((p) => p.division === 'tools' && p.status !== 'archived').length,
              },
            ]}
          />

          <div className="flex flex-col gap-2 md:flex-row">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search by name or SKU"
              className="md:max-w-sm md:flex-1"
            />
            <select
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className={cn(adminInputClass, 'md:w-40')}
            >
              <option value="all">Active (not archived)</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="oos">Out of stock</option>
              <option value="archived">Archived</option>
            </select>
            <select
              aria-label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(adminInputClass, 'md:w-52')}
            >
              <option value="">All categories</option>
              {catOptions.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-canvas/60 px-4 py-2 text-[13px]">
            <span className="mr-1 font-semibold text-ink">{selected.length} selected</span>
            {can('products.edit') && (
              <>
                <AdminButton size="xs" onClick={() => setBulk('publish')}>
                  Publish
                </AdminButton>
                <AdminButton size="xs" onClick={() => setBulk('unpublish')}>
                  Unpublish
                </AdminButton>
                <AdminButton size="xs" onClick={() => setBulk('feature')}>
                  Feature
                </AdminButton>
                <AdminButton size="xs" onClick={() => setBulk('unfeature')}>
                  Unfeature
                </AdminButton>
                <AdminButton size="xs" onClick={() => setBulk('bestseller')}>
                  Bestseller
                </AdminButton>
                <AdminButton size="xs" onClick={() => setBulk('category')}>
                  Category…
                </AdminButton>
              </>
            )}
            {can('products.archive') && (
              <AdminButton size="xs" onClick={() => setBulk('archive')}>
                Archive
              </AdminButton>
            )}
            {can('products.delete') && (
              <AdminButton size="xs" variant="dangerGhost" onClick={() => setBulk('delete')}>
                Delete
              </AdminButton>
            )}
            <button
              onClick={() => setSelected([])}
              className="ml-auto text-xs font-semibold text-subtle hover:text-ink"
            >
              Clear
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <AdminEmpty
            icon={<PackageIcon className="h-5 w-5" />}
            title="No products found"
            text="Change the filters or add a new product."
            action={
              can('products.create') && (
                <AdminButton variant="primary" to="/admin/products/new">
                  Add product
                </AdminButton>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-[13px]">
                <thead className="border-b border-line text-xs text-subtle">
                  <tr>
                    <th className="w-10 px-4 py-2.5">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={allOnPage}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? Array.from(new Set([...selected, ...rows.map((p) => p.id)]))
                              : selected.filter((id) => !rows.some((p) => p.id === id)),
                          )
                        }
                        className="h-4 w-4 accent-ink"
                      />
                    </th>
                    <th className="px-2 py-2.5 font-semibold">Product</th>
                    <th className="px-2 py-2.5 font-semibold">Division · Category</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Price</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Stock</th>
                    <th className="px-2 py-2.5 font-semibold">Status</th>
                    <th className="px-2 py-2.5 font-semibold">Updated</th>
                    <th className="px-4 py-2.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((p) => {
                    const st = stockState(p);
                    const cat = [...categories.hairs, ...categories.tools].find(
                      (c) => p.categories.includes(c.slug) && c.group !== 'Collections',
                    );
                    return (
                      <tr key={p.id} className="transition-colors duration-150 hover:bg-canvas/50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${p.name}`}
                            checked={selected.includes(p.id)}
                            onChange={(e) =>
                              setSelected(e.target.checked ? [...selected, p.id] : selected.filter((x) => x !== p.id))
                            }
                            className="h-4 w-4 accent-ink"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-3">
                            {p.images[0] ? (
                              <img src={p.images[0]} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                            ) : (
                              <span className="h-10 w-10 shrink-0 rounded-md bg-canvas" />
                            )}
                            <div className="min-w-0">
                              <Link
                                href={`/admin/products/${p.id}`}
                                className="block max-w-[280px] truncate font-semibold text-ink hover:underline"
                              >
                                {p.name || 'Untitled product'}
                              </Link>
                              <p className="flex items-center gap-1.5 text-xs text-subtle">
                                <span className="font-mono">{p.sku || '—'}</span>
                                {p.isFeatured && (
                                  <span className="inline-flex items-center gap-0.5 text-gold">
                                    <StarIcon className="h-3 w-3 fill-current" aria-hidden />
                                    Featured
                                  </span>
                                )}
                                {p.isBestseller && <span className="text-charcoal">· Bestseller</span>}
                                {p.isNew && <span className="text-charcoal">· New</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-charcoal">
                          <p>{p.division === 'hairs' ? 'Hairs' : 'Tools'}</p>
                          <p className="text-xs text-subtle">{cat?.name ?? '—'}</p>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                          <p className="font-semibold text-ink">{formatNaira(p.price)}</p>
                          {p.originalPrice && p.originalPrice > p.price && (
                            <p className="text-xs text-subtle line-through">{formatNaira(p.originalPrice)}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right">
                          <p
                            className={cn(
                              'font-semibold tabular-nums',
                              st === 'Out of Stock'
                                ? 'text-red-700'
                                : st === 'Low Stock'
                                  ? 'text-amber-700'
                                  : 'text-ink',
                            )}
                          >
                            {p.trackInventory ? p.stock : '∞'}
                          </p>
                          <p className="text-[11px] text-subtle">{st}</p>
                        </td>
                        <td className="px-2 py-2">
                          <StatusBadge status={statusLabel[p.status]} />
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-xs text-subtle">
                          {formatDate(p.updatedAt)}
                          <br />
                          Added {formatDate(p.createdAt)}
                        </td>
                        <td className="relative px-4 py-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenu(menu === p.id ? null : p.id);
                            }}
                            className="rounded-md p-1.5 text-subtle hover:bg-canvas hover:text-ink"
                            aria-label={`Actions for ${p.name}`}
                            aria-expanded={menu === p.id}
                          >
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </button>
                          {menu === p.id && (
                            <div
                              className="absolute right-4 top-10 z-20 w-44 rounded-xl border border-line bg-white p-1 text-left shadow-soft"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MenuItem
                                icon={<EyeIcon className="h-3.5 w-3.5" />}
                                label="View on store"
                                onClick={() => window.open(`/${p.division}/product/${p.slug}`, '_blank')}
                              />
                              {can('products.edit') && (
                                <MenuItem
                                  icon={<PencilIcon className="h-3.5 w-3.5" />}
                                  label="Edit"
                                  onClick={() => router.push(`/admin/products/${p.id}`)}
                                />
                              )}
                              {can('products.create') && (
                                <MenuItem
                                  icon={<CopyIcon className="h-3.5 w-3.5" />}
                                  label="Duplicate"
                                  onClick={() => {
                                    const c = duplicateProduct(actor, p.id);
                                    setMenu(null);
                                    if (c)
                                      toast.success('Draft copy created', {
                                        action: {
                                          label: 'Open',
                                          onClick: () => router.push(`/admin/products/${c.id}`),
                                        },
                                      });
                                  }}
                                />
                              )}
                              {can('products.archive') && p.status !== 'archived' && (
                                <MenuItem
                                  icon={<ArchiveIcon className="h-3.5 w-3.5" />}
                                  label="Archive"
                                  onClick={() => {
                                    setSingle({ action: 'archive', product: p });
                                    setMenu(null);
                                  }}
                                />
                              )}
                              {can('products.archive') && p.status === 'archived' && (
                                <MenuItem
                                  icon={<ArchiveIcon className="h-3.5 w-3.5" />}
                                  label="Restore as draft"
                                  onClick={() => {
                                    setProductStatus(actor, [p.id], 'draft');
                                    setMenu(null);
                                    toast.success('Restored as draft');
                                  }}
                                />
                              )}
                              {can('products.delete') && (
                                <MenuItem
                                  danger
                                  icon={<TrashIcon className="h-3.5 w-3.5" />}
                                  label="Delete"
                                  onClick={() => {
                                    setSingle({ action: 'delete', product: p });
                                    setMenu(null);
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePager page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!bulk}
        onClose={() => setBulk(null)}
        onConfirm={runBulk}
        title={bulk ? `${bulkLabels[bulk]} — ${selected.length} product${selected.length > 1 ? 's' : ''}?` : ''}
        tone={bulk === 'delete' ? 'danger' : 'default'}
        confirmLabel="Apply"
        message={
          bulk === 'delete'
            ? 'Deleted products can’t be recovered. Archive instead if you may sell them again.'
            : 'This updates the storefront immediately.'
        }
      >
        {bulk === 'category' && (
          <select
            aria-label="Category to add"
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className={adminInputClass}
          >
            <option value="">Choose a category…</option>
            {[...categories.hairs, ...categories.tools].map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={!!single}
        onClose={() => setSingle(null)}
        onConfirm={() => {
          if (!single) return;
          if (single.action === 'archive') setProductStatus(actor, [single.product.id], 'archived');
          else deleteProducts(actor, [single.product.id]);
          toast.success(single.action === 'archive' ? 'Product archived' : 'Product deleted');
          setSingle(null);
        }}
        title={single?.action === 'archive' ? `Archive “${single.product.name}”?` : `Delete “${single?.product.name}”?`}
        tone={single?.action === 'delete' ? 'danger' : 'default'}
        confirmLabel={single?.action === 'archive' ? 'Archive' : 'Delete permanently'}
        message={
          single?.action === 'archive'
            ? 'It will be hidden from the storefront but kept with its sales history. You can restore it later.'
            : 'This can’t be undone. Archiving keeps the history and is usually safer.'
        }
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium',
        danger ? 'text-red-700 hover:bg-red-50' : 'text-charcoal hover:bg-canvas',
      )}
    >
      {icon} {label}
    </button>
  );
}
