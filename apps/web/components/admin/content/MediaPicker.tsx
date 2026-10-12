'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAdminContent } from '@/components/admin/AdminContentProvider';
import { Modal } from '@/components/ui/Modal';
import { uploadAdminImage } from '@/lib/media/upload-client';
import { cn } from '@/lib/utils/cn';

/** Image field: choose from the media library or upload (upload is also saved to the library). */
export function MediaPicker({
  value,
  onChange,
  label,
  compact,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  compact?: boolean;
}) {
  const { media } = useAdminContent();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (f?: File) => {
    if (!f) return;
    setUploading(true);
    try {
      // Stored and resized on the server, and added to the media library.
      onChange(await uploadAdminImage(f, 'content', 'homepage'));
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not upload that image.');
    }
    setUploading(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group relative block w-full overflow-hidden rounded-lg border border-line bg-canvas',
          compact ? 'aspect-square' : 'aspect-[4/5]',
        )}
        aria-label={`Change ${label}`}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto h-5 w-5 text-subtle" aria-hidden />
        )}
        <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-1 text-center text-[11px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          Change
        </span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Choose ${label.toLowerCase()}`}
        className="max-w-3xl rounded-2xl"
      >
        <div className="p-4">
          <label className="mb-3 inline-flex cursor-pointer items-center rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-charcoal">
            {uploading ? 'Uploading…' : 'Upload new image'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                upload(e.target.files?.[0]);
                setOpen(false);
              }}
            />
          </label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {media.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m.url);
                  setOpen(false);
                }}
                className={cn(
                  'overflow-hidden rounded-lg border-2',
                  m.url === value ? 'border-pink' : 'border-transparent hover:border-line',
                )}
              >
                <img src={m.url} alt={m.name} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
