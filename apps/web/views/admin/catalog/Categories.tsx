'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { FolderTreeIcon, PencilIcon, PlusIcon, TrashIcon } from 'lucide-react';
import type { Category, Division } from '@/types/product';
import { useRouter } from 'next/navigation';
import { useAdminCatalog } from '@/components/admin/AdminCatalogProvider';
import { deleteCategory, saveCategory } from '@/lib/catalog/category-actions';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { FilterTabs } from '@/components/admin/ui/FilterTabs';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { AdminInput, AdminTextarea } from '@/components/admin/ui/AdminField';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { uploadAdminImage } from '@/lib/media/upload-client';
import { slugify } from '@/lib/utils/text';

const blank: Category = { slug: '', name: '', description: '', group: '', image: '' };

/** Store categories, loaded on the server; changes go through permission-checked server actions. */
export function Categories() {
  const router = useRouter();
  const { categories, products } = useAdminCatalog();
  const [division, setDivision] = useState<Division>('hairs');
  const [editing, setEditing] = useState<{ cat: Category; original?: string } | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);

  const list = categories[division];
  const groups = Array.from(new Set(list.map((c) => c.group)));
  const count = (slug: string) =>
    products.filter((p) => p.division === division && p.categories.includes(slug) && p.status !== 'archived').length;

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organise each store’s categories and subcategory groups. These drive the store menus and filters."
        actions={
          <AdminButton
            variant="primary"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setEditing({ cat: { ...blank, group: groups[0] ?? '' } })}
          >
            Add category
          </AdminButton>
        }
      />

      <div className="mb-4">
        <FilterTabs
          label="Store"
          value={division}
          onChange={setDivision}
          options={[
            { value: 'hairs', label: 'LUXICHIC Hairs', count: categories.hairs.length },
            { value: 'tools', label: 'Hair Tools & Essentials', count: categories.tools.length },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-line bg-white">
          <AdminEmpty icon={<FolderTreeIcon className="h-5 w-5" />} title="No categories yet" />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g} className="rounded-xl border border-line bg-white" aria-labelledby={`grp-${slugify(g)}`}>
              <h2
                id={`grp-${slugify(g)}`}
                className="border-b border-line px-4 py-2.5 text-xs font-semibold text-subtle"
              >
                {g || 'Ungrouped'}
              </h2>
              <ul className="divide-y divide-line">
                {list
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <li key={c.slug} className="flex items-center gap-3 px-4 py-2.5">
                      {c.image ? (
                        <img src={c.image} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-md bg-canvas" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink">{c.name}</p>
                        <p className="truncate text-xs text-subtle">
                          /{c.slug} · {c.description || 'No description'}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-subtle">{count(c.slug)} products</span>
                      <button
                        onClick={() => setEditing({ cat: c, original: c.slug })}
                        className="rounded-md p-1.5 text-subtle hover:bg-canvas hover:text-ink"
                        aria-label={`Edit ${c.name}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setRemoving(c)}
                        className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${c.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <CategoryDialog
        key={editing?.original ?? (editing ? 'new' : 'closed')}
        editing={editing}
        division={division}
        groups={groups}
        existing={list}
        onClose={() => setEditing(null)}
        onSave={async (cat, original) => {
          const res = await saveCategory(division, cat, original).catch(() => null);
          if (!res?.ok) return res?.error ?? 'Could not save the category.';
          toast.success(original ? 'Category updated' : 'Category added');
          setEditing(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const res = await deleteCategory(division, removing.slug).catch(() => null);
          setRemoving(null);
          if (!res?.ok) return toast.error(res?.error ?? 'Could not delete the category.');
          toast.success('Category deleted');
          router.refresh();
        }}
        title={`Delete “${removing?.name}”?`}
        tone="danger"
        confirmLabel="Delete category"
        message={
          removing && count(removing.slug) > 0
            ? `${count(removing.slug)} product(s) use this category. They stay on the store but will no longer appear under it.`
            : 'This category will be removed from the store menus.'
        }
      />
    </div>
  );
}

function CategoryDialog({
  editing,
  division,
  groups,
  existing,
  onClose,
  onSave,
}: {
  editing: { cat: Category; original?: string } | null;
  division: Division;
  groups: string[];
  existing: Category[];
  onClose: () => void;
  /** Saves; resolves to an error message if it couldn't. */
  onSave: (c: Category, original?: string) => Promise<string | void>;
}) {
  const [cat, setCat] = useState<Category>(editing?.cat ?? blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const upload = async (f?: File) => {
    if (!f) return;
    try {
      setCat((c) => ({ ...c, image: '' }));
      const url = await uploadAdminImage(f, 'category', division === 'hairs' ? 'hairs' : 'hair_tools');
      setCat((c) => ({ ...c, image: url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read image');
    }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = cat.slug.trim() || slugify(cat.name);
    const errs: Record<string, string> = {};
    if (!cat.name.trim()) errs.name = 'Enter a category name.';
    if (existing.some((c) => c.slug === slug && c.slug !== editing?.original))
      errs.slug = 'Another category already uses this URL.';
    if (!cat.group.trim()) errs.group = 'Choose or type a group.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const error = await onSave({ ...cat, name: cat.name.trim(), group: cat.group.trim(), slug }, editing?.original);
    setSaving(false);
    if (error) setErrors({ form: error });
  };
  return (
    <Modal
      open={!!editing}
      onClose={onClose}
      title={editing?.original ? 'Edit category' : 'Add category'}
      className="max-w-lg rounded-2xl"
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminInput
            id="cat-name"
            label="Name"
            value={cat.name}
            error={errors.name}
            onChange={(e) => setCat({ ...cat, name: e.target.value })}
          />
          <AdminInput
            id="cat-slug"
            label="URL slug"
            value={cat.slug}
            error={errors.slug}
            placeholder={slugify(cat.name) || 'auto'}
            onChange={(e) => setCat({ ...cat, slug: slugify(e.target.value) })}
          />
        </div>
        <AdminInput
          id="cat-group"
          label="Group (menu heading)"
          list="cat-groups"
          value={cat.group}
          error={errors.group}
          onChange={(e) => setCat({ ...cat, group: e.target.value })}
          hint="Pick an existing group or type a new one."
        />
        <datalist id="cat-groups">
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        <AdminTextarea
          id="cat-desc"
          label="Description"
          optional
          value={cat.description}
          onChange={(e) => setCat({ ...cat, description: e.target.value })}
          className="min-h-[64px]"
        />
        <div>
          <p className="mb-1 text-xs font-semibold text-charcoal">Image</p>
          <div className="flex items-center gap-3">
            {cat.image ? (
              <img src={cat.image} alt="" className="h-14 w-14 rounded-md object-cover" />
            ) : (
              <span className="h-14 w-14 rounded-md bg-canvas" />
            )}
            <label className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink/40">
              Upload
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {cat.image && (
              <button
                type="button"
                onClick={() => setCat({ ...cat, image: '' })}
                className="text-xs font-semibold text-subtle hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        {errors.form && (
          <p className="text-xs text-red-700" role="alert">
            {errors.form}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary" loading={saving}>
            Save category
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}
