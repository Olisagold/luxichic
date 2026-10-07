'use client';

import React from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronLeftIcon, ExternalLinkIcon, PackageXIcon } from 'lucide-react';
import type { Division } from '@/types/product';
import { useProductEditor } from '@/hooks/useProductEditor';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { getDb } from '@/lib/mock-db/db';
import { BasicsSection } from '@/components/admin/product-editor/BasicsSection';
import { PricingSection } from '@/components/admin/product-editor/PricingSection';
import { ImagesSection } from '@/components/admin/product-editor/ImagesSection';
import { VariantsSection } from '@/components/admin/product-editor/VariantsSection';
import { SpecsSection } from '@/components/admin/product-editor/SpecsSection';
import { InventorySection, ShippingSection } from '@/components/admin/product-editor/InventoryShippingSection';
import { StatusSection } from '@/components/admin/product-editor/StatusSection';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { StatusBadge } from '@/components/ui/StatusBadge';

const sections = [
  ['basics', 'Basics'],
  ['pricing', 'Pricing'],
  ['images', 'Images'],
  ['options', 'Options & stock'],
  ['specs', 'Specifications'],
  ['shipping', 'Shipping'],
] as const;

export function ProductEditor() {
  const { id } = useParams<{ id: string }>();
  const isNewRoute = !id || id === 'new';
  const exists = isNewRoute || !!getDb().products.find((p) => p.id === id);
  if (!exists) {
    return (
      <div className="rounded-xl border border-line bg-white">
        <AdminEmpty
          icon={<PackageXIcon className="h-5 w-5" />}
          title="Product not found"
          action={<AdminButton to="/admin/products">Back to products</AdminButton>}
        />
      </div>
    );
  }
  return <Editor key={id ?? 'new'} id={isNewRoute ? undefined : id} />;
}

function Editor({ id }: { id?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const { can } = useAdminAuth();
  const editor = useProductEditor(id, (params.get('division') as Division) || 'hairs');
  const { draft, dirty, saving, save, isNew, errors } = editor;
  const canSave = isNew ? can('products.create') : can('products.edit');

  const leave = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    router.push('/admin/products');
  };

  const onSave = async () => {
    const saved = await save();
    if (!saved) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    toast.success(isNew ? 'Product created' : 'Changes saved', {
      description: saved.status === 'published' ? 'Live on the storefront now.' : `Saved as ${saved.status}.`,
    });
    if (isNew) router.replace(`/admin/products/${saved.id}`);
  };

  const jump = (key: string) =>
    document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="pb-20">
      <header className="mb-5">
        <button
          onClick={leave}
          className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-subtle hover:text-ink"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" aria-hidden /> Products
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl text-ink md:text-[2.1rem]">
              {isNew ? 'Add product' : draft.name || 'Untitled product'}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-[13px] text-subtle">
              {draft.division === 'hairs' ? 'LUXICHIC Hairs' : 'Hair Tools & Essentials'}
              {!isNew && (
                <StatusBadge
                  status={draft.status === 'draft' ? 'Draft' : draft.status === 'published' ? 'Published' : 'Archived'}
                />
              )}
            </p>
          </div>
          {!isNew && draft.status === 'published' && (
            <AdminButton
              icon={<ExternalLinkIcon className="h-4 w-4" />}
              onClick={() => window.open(`/${draft.division}/product/${draft.slug}`, '_blank')}
            >
              View on store
            </AdminButton>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[160px_minmax(0,1fr)_300px]">
        <nav aria-label="Editor sections" className="hidden lg:block">
          <ul className="sticky top-20 space-y-0.5">
            {sections.map(([k, l]) => (
              <li key={k}>
                <button
                  onClick={() => jump(k)}
                  className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-charcoal hover:bg-white"
                >
                  {l}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          <div id="sec-basics" className="scroll-mt-20">
            <BasicsSection editor={editor} />
          </div>
          <div id="sec-pricing" className="scroll-mt-20">
            <PricingSection editor={editor} />
          </div>
          <div id="sec-images" className="scroll-mt-20">
            <ImagesSection editor={editor} />
          </div>
          <div id="sec-options" className="scroll-mt-20">
            <VariantsSection editor={editor} />
          </div>
          <div id="sec-specs" className="scroll-mt-20">
            <SpecsSection editor={editor} />
          </div>
          <div id="sec-shipping" className="scroll-mt-20 lg:hidden">
            <ShippingSection editor={editor} />
          </div>
        </div>

        <aside className="space-y-5">
          <StatusSection editor={editor} />
          <InventorySection editor={editor} />
          <div className="hidden lg:block">
            <ShippingSection editor={editor} />
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {(dirty || isNew) && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:left-auto lg:right-0 lg:w-[calc(100%-15rem)]"
          >
            <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 lg:px-8">
              <p className="text-[13px] text-charcoal">
                {Object.keys(errors).length > 0 ? (
                  <span className="font-semibold text-red-700">
                    {Object.keys(errors).length} field{Object.keys(errors).length > 1 ? 's' : ''} need attention
                  </span>
                ) : isNew ? (
                  'New product — not saved yet'
                ) : (
                  'Unsaved changes'
                )}
              </p>
              <div className="flex gap-2">
                <AdminButton variant="ghost" onClick={leave}>
                  Discard
                </AdminButton>
                <AdminButton variant="primary" loading={saving} disabled={!canSave} onClick={onSave}>
                  {isNew ? 'Create product' : 'Save changes'}
                </AdminButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
