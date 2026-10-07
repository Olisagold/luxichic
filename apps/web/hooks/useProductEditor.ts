import { useEffect, useMemo, useState } from 'react';
import type { AdminProduct } from '@/types/admin';
import type { Division } from '@/types/product';
import { getDb } from '@/lib/mock-db/db';
import { emptyProduct, saveProduct } from '@/lib/mock-db/catalog';
import { useActor } from '@/hooks/useActor';
import { slugify } from '@/lib/utils/text';

export interface EditorErrors {
  [field: string]: string;
}

/** Holds a draft copy of a product, tracks unsaved changes and validates before saving. */
export function useProductEditor(id: string | undefined, division: Division) {
  const actor = useActor();
  const existing = id ? getDb().products.find((p) => p.id === id) : undefined;
  const initial = useMemo(() => existing ?? emptyProduct(division), [existing, division]);
  const [draft, setDraft] = useState<AdminProduct>(() => JSON.parse(JSON.stringify(initial)));
  const [regular, setRegular] = useState<number>(() => initial.originalPrice && initial.originalPrice > initial.price ? initial.originalPrice : initial.price);
  const [errors, setErrors] = useState<EditorErrors>({});
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState<string | null>(null);

  const salePrice = useMemo(() => {
    if (draft.discountMode === 'percent') return Math.round(regular * (1 - (draft.discountPercent ?? 0) / 100));
    if (draft.discountMode === 'fixed') return draft.price;
    return regular;
  }, [draft.discountMode, draft.discountPercent, draft.price, regular]);

  const compiled = useMemo<AdminProduct>(() => {
    const hasDiscount = draft.discountMode !== 'none' && salePrice < regular;
    const variantStock = draft.variants.flatMap((g) => g.values.map((v) => v.stock)).filter((s): s is number => s !== undefined);
    return {
      ...draft,
      slug: draft.slug || slugify(draft.name),
      price: hasDiscount ? salePrice : regular,
      originalPrice: hasDiscount ? regular : undefined,
      isSale: hasDiscount ? true : draft.isSale,
      // When every option carries its own stock, the product total follows the largest option group.
      stock: variantStock.length && draft.variants.every((g) => g.values.every((v) => v.stock !== undefined)) ?
      Math.max(...draft.variants.map((g) => g.values.reduce((s, v) => s + (v.stock ?? 0), 0))) :
      draft.stock
    };
  }, [draft, regular, salePrice]);

  useEffect(() => {
    if (baseline === null) setBaseline(JSON.stringify(compiled));
  }, [baseline, compiled]);

  const dirty = baseline !== null && JSON.stringify(compiled) !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {e.preventDefault();e.returnValue = '';};
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (patch: Partial<AdminProduct>) => setDraft((d) => ({ ...d, ...patch }));

  const validate = (): EditorErrors => {
    const e: EditorErrors = {};
    if (!draft.name.trim()) e.name = 'Enter a product name.';
    if (!draft.sku.trim()) e.sku = 'Enter a SKU.';else
    if (getDb().products.some((p) => p.sku.toLowerCase() === draft.sku.trim().toLowerCase() && p.id !== draft.id)) e.sku = 'Another product already uses this SKU.';
    if (!draft.categories.length) e.categories = 'Choose at least one category.';
    if (!regular || regular <= 0) e.price = 'Enter a regular price above ₦0.';
    if (draft.discountMode === 'percent' && (!draft.discountPercent || draft.discountPercent <= 0 || draft.discountPercent >= 100)) e.discount = 'Enter a percentage between 1 and 99.';
    if (draft.discountMode === 'fixed' && (draft.price <= 0 || draft.price >= regular)) e.discount = 'Sale price must be lower than the regular price.';
    if (draft.discountStart && draft.discountEnd && draft.discountEnd < draft.discountStart) e.discount = 'The discount end date is before the start date.';
    if (draft.status === 'published' && !draft.images.length) e.images = 'Add at least one image before publishing.';
    return e;
  };

  const save = async (): Promise<AdminProduct | null> => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return null;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 450));
    const saved = saveProduct(actor, { ...compiled, name: compiled.name.trim(), sku: compiled.sku.trim() });
    setDraft(saved);
    setRegular(saved.originalPrice && saved.originalPrice > saved.price ? saved.originalPrice : saved.price);
    setBaseline(null);
    setSaving(false);
    return saved;
  };

  return { draft, update, setDraft, regular, setRegular, salePrice, errors, saving, save, dirty, isNew: !existing };
}

export type ProductEditorState = ReturnType<typeof useProductEditor>;