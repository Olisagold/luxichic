'use client';

import React, { useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import { toast } from 'sonner';
import { GripVerticalIcon, ImageIcon, RefreshCwIcon, StarIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import type { ProductEditorState } from '@/hooks/useProductEditor';
import { useAdminCatalog } from '@/components/admin/AdminCatalogProvider';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { Modal } from '@/components/ui/Modal';
import { uploadAdminImage } from '@/lib/media/upload-client';

/** Drag to reorder; the first image is the primary image shown on cards. */
export function ImagesSection({ editor }: { editor: ProductEditorState }) {
  const { draft, update, errors } = editor;
  const media = useAdminCatalog().media ?? [];
  const upload = (file: File) => uploadAdminImage(file, 'product', draft.division === 'hairs' ? 'hairs' : 'hair_tools');
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      // One at a time, so each finished image shows up straight away.
      let images = draft.images;
      for (const file of Array.from(files).slice(0, 8)) {
        images = [...images, await upload(file)];
        update({ images });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read that image.');
    }
    setBusy(false);
  };

  const replace = async (files: FileList | null) => {
    if (!files?.[0] || replaceIndex === null) return;
    try {
      const url = await upload(files[0]);
      update({ images: draft.images.map((img, i) => (i === replaceIndex ? url : img)) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read that image.');
    }
    setReplaceIndex(null);
  };

  const makePrimary = (url: string) => update({ images: [url, ...draft.images.filter((i) => i !== url)] });

  return (
    <Panel
      title="Images"
      description="Drag to reorder. The first image is the primary image."
      actions={
        <>
          <AdminButton size="sm" onClick={() => setLibraryOpen(true)} icon={<ImageIcon className="h-3.5 w-3.5" />}>
            From library
          </AdminButton>
          <AdminButton
            size="sm"
            variant="primary"
            loading={busy}
            onClick={() => fileRef.current?.click()}
            icon={<UploadIcon className="h-3.5 w-3.5" />}
          >
            Upload
          </AdminButton>
        </>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          replace(e.target.files);
          e.target.value = '';
        }}
      />
      {errors.images && <p className="mb-3 text-xs text-red-700">{errors.images}</p>}

      {draft.images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            add(e.dataTransfer.files);
          }}
          className="flex w-full flex-col items-center rounded-lg border border-dashed border-line px-6 py-10 text-center hover:border-ink/40"
        >
          <UploadIcon className="h-5 w-5 text-subtle" aria-hidden />
          <span className="mt-2 text-[13px] font-semibold text-ink">Drop images here or click to upload</span>
          <span className="text-xs text-subtle">JPG, PNG, WebP or HEIC, up to 25 MB. Resized automatically.</span>
        </button>
      ) : (
        <Reorder.Group axis="y" values={draft.images} onReorder={(images) => update({ images })} className="space-y-2">
          {draft.images.map((url, i) => (
            <Reorder.Item
              key={url}
              value={url}
              className="flex cursor-grab items-center gap-3 rounded-lg border border-line bg-white p-2 active:cursor-grabbing"
            >
              <GripVerticalIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <button
                type="button"
                onClick={() => setPreview(url)}
                className="shrink-0"
                aria-label={`Preview image ${i + 1}`}
              >
                <img src={url} alt="" className="h-14 w-14 rounded-md object-cover" />
              </button>
              <div className="min-w-0 flex-1 text-xs">
                {i === 0 ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-ink">
                    <StarIcon className="h-3 w-3 fill-gold text-gold" aria-hidden />
                    Primary image
                  </span>
                ) : (
                  <span className="text-subtle">Image {i + 1}</span>
                )}
              </div>
              {i !== 0 && (
                <AdminButton size="xs" variant="ghost" onClick={() => makePrimary(url)}>
                  Set primary
                </AdminButton>
              )}
              <button
                type="button"
                onClick={() => {
                  setReplaceIndex(i);
                  replaceRef.current?.click();
                }}
                className="rounded-md p-1.5 text-subtle hover:bg-canvas hover:text-ink"
                aria-label="Replace image"
              >
                <RefreshCwIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => update({ images: draft.images.filter((x) => x !== url) })}
                className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-700"
                aria-label="Remove image"
              >
                <Trash2Icon className="h-3.5 w-3.5" />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Image preview" className="max-w-2xl rounded-2xl">
        {preview && <img src={preview} alt="Product preview" className="max-h-[70vh] w-full object-contain p-4" />}
      </Modal>

      <Modal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        title="Media library"
        className="max-w-3xl rounded-2xl"
      >
        <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-5">
          {media.map((m) => {
            const used = draft.images.includes(m.url);
            return (
              <button
                key={m.id}
                type="button"
                disabled={used}
                onClick={() => {
                  update({ images: [...draft.images, m.url] });
                  setLibraryOpen(false);
                }}
                className="group relative overflow-hidden rounded-lg border border-line disabled:opacity-40"
              >
                <img src={m.url} alt={m.name} className="aspect-square w-full object-cover" />
                <span className="block truncate px-1.5 py-1 text-left text-[11px] text-charcoal">
                  {used ? 'Already added' : m.name}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
    </Panel>
  );
}
