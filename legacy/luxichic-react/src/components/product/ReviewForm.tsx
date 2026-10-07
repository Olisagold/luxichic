import React, { useState } from 'react';
import { ImagePlusIcon, StarIcon, XIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { TextAreaField, TextField } from '../ui/FormField';
import { cn } from '../../utils/cn';

export interface ReviewDraft {
  rating: number;
  title: string;
  body: string;
  images: string[];
}

interface ReviewFormProps {
  initial?: ReviewDraft;
  submitLabel?: string;
  onSubmit: (d: ReviewDraft) => void;
  onCancel: () => void;
}

export function ReviewForm({ initial, submitLabel = 'Post Review', onSubmit, onCancel }: ReviewFormProps) {
  const [draft, setDraft] = useState<ReviewDraft>(initial ?? { rating: 0, title: '', body: '', images: [] });
  const [hover, setHover] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const addImages = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).
    slice(0, 3 - draft.images.length).
    forEach((f) => {
      if (!f.type.startsWith('image/') || f.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = () => setDraft((d) => ({ ...d, images: [...d.images, String(reader.result)].slice(0, 3) }));
      reader.readAsDataURL(f);
    });
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
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    onSubmit({ ...draft, title: draft.title.trim(), body: draft.body.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl bg-white p-6">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-charcoal">Your rating</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) =>
          <button
            key={n}
            type="button"
            onClick={() => setDraft((d) => ({ ...d, rating: n }))}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-pressed={draft.rating === n}
            className="p-1">
            
              <StarIcon className={cn('h-7 w-7 transition-colors duration-100', (hover || draft.rating) >= n ? 'text-gold' : 'text-line')} fill="currentColor" strokeWidth={0} />
            </button>
          )}
        </div>
        {errors.rating && <p className="mt-1 text-xs text-red-700" role="alert">{errors.rating}</p>}
      </fieldset>
      <TextField id="review-title" label="Review title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} error={errors.title} maxLength={80} />
      <TextAreaField id="review-body" label="Your review" value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} error={errors.body} maxLength={1000} />
      <div>
        <p className="mb-2 text-xs font-semibold text-charcoal">
          Photos <span className="font-normal text-subtle">— optional, up to 3</span>
        </p>
        <div className="flex flex-wrap gap-3">
          {draft.images.map((src, i) =>
          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl">
              <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
              <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, images: d.images.filter((_, x) => x !== i) }))}
              className="absolute right-1 top-1 rounded-full bg-white p-1 text-ink"
              aria-label={`Remove photo ${i + 1}`}>
              
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          )}
          {draft.images.length < 3 &&
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-[10px] text-subtle transition-colors duration-150 hover:border-ink">
              <ImagePlusIcon className="h-5 w-5" aria-hidden />
              Add
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addImages(e.target.files)} />
            </label>
          }
        </div>
      </div>
      <div className="flex gap-3">
        <Button type="submit" loading={saving}>{submitLabel}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>);

}