'use client';

import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CopyIcon, ImageIcon, TrashIcon, UploadIcon } from 'lucide-react';
import type { MediaItem } from '@/types/admin';
import { useRouter } from 'next/navigation';
import { useAdminContent } from '@/components/admin/AdminContentProvider';
import { deleteMedia, mediaUploaded } from '@/lib/content/admin-actions';
import { uploadAdminImage } from '@/lib/media/upload-client';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { FilterTabs } from '@/components/admin/ui/FilterTabs';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils/dates';

type Folder = MediaItem['folder'];
const folders: Folder[] = ['Homepage', 'Hairs', 'Hair Tools', 'Salon', 'Products', 'Services'];
/** The library's folder names as stored in the database. */
const FOLDER_KEY = {
  Homepage: 'homepage',
  Hairs: 'hairs',
  'Hair Tools': 'hair_tools',
  Salon: 'salon',
  Products: 'products',
  Services: 'services',
} as const;

export function MediaLibrary() {
  const { media, products, content } = useAdminContent();
  const router = useRouter();
  const [folder, setFolder] = useState<'all' | Folder>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<MediaItem | null>(null);
  const [removing, setRemoving] = useState<MediaItem | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      media.filter((m) => (folder === 'all' || m.folder === folder) && m.name.toLowerCase().includes(q.toLowerCase())),
    [media, folder, q],
  );
  const usedIn = (url: string) => {
    const where: string[] = products.filter((p) => p.images.includes(url)).map((p) => p.name);
    if (JSON.stringify(content).includes(url)) where.push('Website content');
    return where;
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let ok = 0;
    for (const f of Array.from(files).slice(0, 10)) {
      try {
        await uploadAdminImage(f, 'content', FOLDER_KEY[folder === 'all' ? 'Products' : folder]);
        ok += 1;
      } catch (e) {
        toast.error(`${f.name}: ${e instanceof Error ? e.message : 'could not be uploaded'}`);
      }
    }
    setBusy(false);
    if (ok) {
      await mediaUploaded(ok).catch(() => null);
      toast.success(`Uploaded ${ok} image${ok > 1 ? 's' : ''}`);
      router.refresh();
    }
  };

  return (
    <div>
      <PageHeader
        title="Media library"
        description="Images used across the store. Uploads are resized automatically for faster loading."
        actions={
          <AdminButton
            variant="primary"
            loading={busy}
            icon={<UploadIcon className="h-4 w-4" />}
            onClick={() => fileRef.current?.click()}
          >
            Upload
          </AdminButton>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = '';
        }}
      />
      <div
        className="rounded-xl border border-line bg-white"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files);
        }}
      >
        <div className="space-y-3 border-b border-line p-3 sm:p-4">
          <FilterTabs
            label="Folder"
            value={folder}
            onChange={setFolder}
            options={[
              { value: 'all', label: 'All', count: media.length },
              ...folders.map((f) => ({ value: f, label: f, count: media.filter((m) => m.folder === f).length })),
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Search by file name" className="sm:max-w-sm" />
        </div>
        {filtered.length === 0 ? (
          <AdminEmpty
            icon={<ImageIcon className="h-5 w-5" />}
            title="No images here"
            text="Drop images anywhere on this panel to upload."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
            {filtered.map((m) => (
              <li key={m.id}>
                <button onClick={() => setOpen(m)} className="group block w-full text-left">
                  <img
                    src={m.url}
                    alt={m.name}
                    className="aspect-square w-full rounded-lg object-cover ring-1 ring-line transition-[box-shadow] duration-150 group-hover:ring-ink/40"
                  />
                  <p className="mt-1 truncate text-xs font-medium text-ink">{m.name}</p>
                  <p className="text-[11px] text-subtle">{m.folder}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.name ?? 'Image'}
        className="max-w-2xl rounded-2xl"
      >
        {open && (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_220px]">
            <img src={open.url} alt={open.name} className="max-h-[60vh] w-full rounded-lg object-contain" />
            <div className="space-y-3 text-[13px]">
              <dl className="space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-subtle">Folder</dt>
                  <dd className="text-ink">{open.folder}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-subtle">Size</dt>
                  <dd className="text-ink">
                    {open.width}×{open.height} · {open.sizeKb} KB
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-subtle">Uploaded</dt>
                  <dd className="text-ink">{formatDate(open.uploadedAt)}</dd>
                </div>
              </dl>
              <div>
                <p className="text-xs font-semibold text-subtle">Used in</p>
                <p className="mt-0.5 text-charcoal">{usedIn(open.url).join(', ') || 'Not used'}</p>
              </div>
              <AdminButton
                size="sm"
                className="w-full"
                icon={<CopyIcon className="h-3.5 w-3.5" />}
                onClick={() => {
                  navigator.clipboard?.writeText(open.url);
                  toast.success('Image link copied');
                }}
              >
                Copy link
              </AdminButton>
              <AdminButton
                size="sm"
                variant="dangerGhost"
                className="w-full"
                icon={<TrashIcon className="h-3.5 w-3.5" />}
                onClick={() => {
                  setRemoving(open);
                  setOpen(null);
                }}
              >
                Delete
              </AdminButton>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const res = await deleteMedia(removing.id).catch(() => null);
          setRemoving(null);
          if (!res?.ok) return toast.error(res?.error ?? 'Could not delete the image.');
          setOpen(null);
          toast.success('Image deleted from the library');
          router.refresh();
        }}
        title="Delete this image?"
        tone="danger"
        confirmLabel="Delete image"
        message={
          removing && usedIn(removing.url).length
            ? `It’s still used in: ${usedIn(removing.url).join(', ')}. Those places keep showing it until you replace it.`
            : 'It isn’t used anywhere.'
        }
      />
    </div>
  );
}
