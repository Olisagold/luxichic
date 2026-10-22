'use client';

import React, { useState } from 'react';
import { ImagePlusIcon, StarIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/FormField';
import { cn } from '@/lib/utils/cn';
import { shrinkPhoto } from '@/lib/media/shrink';
import { uploadReviewPhoto } from '@/lib/reviews/actions';

export interface ReviewDraft {
  rating: number;
  title: string;
  body: string;
  images: string[];
}

interface ReviewFormProps {
  initial?: ReviewDraft;
  submitLabel?: string;
  /** Saves the review; resolves to an error message if it couldn't. */
  onSubmit: (d: ReviewDraft) => Promise<string | void>;
  onCancel: () => void;
}

export function ReviewForm({ initial, submitLabel = 'Post Review', onSubmit, onCancel }: ReviewFormProps) {
  const [draft, setDraft] = useState<ReviewDraft>(initial ?? { rating: 0, title: '', body: '', images: [] });
  const [hover, setHover] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(0);

  // Each photo is shrunk in the browser, then stored on the server; the form keeps its URL.
  const addImages = async (files: FileList | null) => {
    if (!files) return;
    const chosen = Array.from(files).slice(0, 3 - draft.images.length - uploading);
    setErrors((e) => ({ ...e, images: '' }));
    setUploading((n) => n + chosen.length);
    for (const file of chosen) {
      try {
        if (!file.type.startsWith('image/')) throw new Error('Please choose a photo.');
        const form = new FormData();
        form.append('photo', await shrinkPhoto(file), 'photo.jpg');
        const res = await uploadReviewPhoto(form);
        if (!res.ok || !res.url) throw new Error(res.error);
        const url = res.url;
        setDraft((d) => ({ ...d, images: [...d.images, url].slice(0, 3) }));
      } catch (err) {
        setErrors((e) => ({
          ...e,
          images: (err instanceof Error && err.message) || 'We couldn’t add that photo. Please try another.',
        }));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!draft.rating) errs.rating = 'Please choose a star rating.';
    if (draft.title.trim().length < 3) errs.title = 'Add a short title.';
    if (draft.body.trim().length < 10) errs.body = 'Tell us a little more (at least 10 characters).';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const error = await onSubmit({ ...draft, title: draft.title.trim(), body: draft.body.trim() }).catch(
      () => 'We couldn’t save your review. Please check your connection and try again.',
    );
    setSaving(false);
    if (error) setErrors({ form: error });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl bg-white p-6">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-charcoal">Your rating</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, rating: n }))}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              aria-pressed={draft.rating === n}
              className="p-1"
            >
              <StarIcon
                className={cn(
                  'h-7 w-7 transition-colors duration-100',
                  (hover || draft.rating) >= n ? 'text-gold' : 'text-line',
                )}
                fill="currentColor"
                strokeWidth={0}
              />
            </button>
          ))}
        </div>
        {errors.rating && (
          <p className="mt-1 text-xs text-red-700" role="alert">
            {errors.rating}
          </p>
        )}
      </fieldset>
      <TextField
        id="review-title"
        label="Review title"
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        error={errors.title}
        maxLength={80}
      />
      <TextAreaField
        id="review-body"
        label="Your review"
        value={draft.body}
        onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
        error={errors.body}
        maxLength={1000}
      />
      <div>
        <p className="mb-2 text-xs font-semibold text-charcoal">
          Photos <span className="font-normal text-subtle">(optional, up to 3)</span>
        </p>
        <div className="flex flex-wrap gap-3">
          {draft.images.map((src, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl">
              <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, images: d.images.filter((_, x) => x !== i) }))}
                className="absolute right-1 top-1 rounded-full bg-white p-1 text-ink"
                aria-label={`Remove photo ${i + 1}`}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div
              key={`up${i}`}
              className="flex h-20 w-20 items-center justify-center rounded-xl bg-ivory text-[10px] text-subtle"
              aria-busy="true"
            >
              Uploading…
            </div>
          ))}
          {draft.images.length + uploading < 3 && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-[10px] text-subtle transition-colors duration-150 hover:border-ink">
              <ImagePlusIcon className="h-5 w-5" aria-hidden />
              Add
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void addImages(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>
      {errors.images && (
        <p className="-mt-2 text-xs text-red-700" role="alert">
          {errors.images}
        </p>
      )}
      {errors.form && (
        <p className="text-sm text-red-700" role="alert">
          {errors.form}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" loading={saving} disabled={uploading > 0}>
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
