import React, { useState } from 'react';
import { Reorder } from 'framer-motion';
import { toast } from 'sonner';
import { ExternalLinkIcon, GripVerticalIcon, PlusIcon, StarIcon, Trash2Icon } from 'lucide-react';
import type { SiteContent, Testimonial } from '../../../types/admin';
import { useActor } from '../../../hooks/useActor';
import { useContentDraft } from '../../../hooks/useContentDraft';
import { useDb } from '../../../services/db';
import { updateContent } from '../../../services/settings';
import { PageHeader } from '../../../components/admin/ui/PageHeader';
import { Panel } from '../../../components/admin/ui/Panel';
import { AdminButton } from '../../../components/admin/ui/AdminButton';
import { AdminInput, AdminTextarea, adminInputClass } from '../../../components/admin/ui/AdminField';
import { Toggle } from '../../../components/admin/ui/Toggle';
import { SaveBar } from '../../../components/admin/content/SaveBar';
import { MediaPicker } from '../../../components/admin/content/MediaPicker';
import { generateId } from '../../../utils/references';
import { initials } from '../../../utils/text';
import { cn } from '../../../utils/cn';

type HomeKey = 'announcements' | 'sections' | 'hero' | 'intro' | 'divisions' | 'featuredProductIds' | 'featuredServiceSlugs' | 'salonSection' | 'why' | 'testimonials';
const keys: HomeKey[] = ['announcements', 'sections', 'hero', 'intro', 'divisions', 'featuredProductIds', 'featuredServiceSlugs', 'salonSection', 'why', 'testimonials'];
const tabs = [['layout', 'Layout & banner'], ['hero', 'Hero & intro'], ['featured', 'Featured items'], ['social', 'Why us & testimonials']] as const;

export function HomepageContent() {
  const actor = useActor();
  const c = useContentDraft(keys);
  const { draft, set } = c;
  const [tab, setTab] = useState<(typeof tabs)[number][0]>('layout');

  const save = () => {
    c.changedKeys().forEach((k) => updateContent(actor, k, draft[k] as never, 'Updated homepage'));
    c.markSaved();
    toast.success('Homepage published', { description: 'Changes are live on the storefront.' });
  };

  return (
    <div className="pb-20">
      <PageHeader
        title="Homepage"
        description="Edit the announcement bar, hero, featured items and sections on the main LUXICHIC homepage."
        actions={<AdminButton icon={<ExternalLinkIcon className="h-4 w-4" />} onClick={() => window.open('/', '_blank')}>View homepage</AdminButton>} />
      
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {tabs.map(([k, l]) =>
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-semibold', tab === k ? 'border-pink text-ink' : 'border-transparent text-subtle hover:text-ink')}>{l}</button>
        )}
      </div>

      {tab === 'layout' &&
      <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Announcement bar" description="Messages rotate at the top of every page.">
            <ul className="space-y-2">
              {draft.announcements.map((a, i) =>
            <li key={a.id} className="flex items-center gap-2">
                  <input aria-label={`Announcement ${i + 1}`} value={a.text} onChange={(e) => set('announcements', draft.announcements.map((x) => x.id === a.id ? { ...x, text: e.target.value } : x))} className={cn(adminInputClass, !a.enabled && 'text-subtle')} />
                  <Toggle srOnlyLabel label={`Show announcement ${i + 1}`} checked={a.enabled} onChange={(v) => set('announcements', draft.announcements.map((x) => x.id === a.id ? { ...x, enabled: v } : x))} />
                  <button onClick={() => set('announcements', draft.announcements.filter((x) => x.id !== a.id))} className="rounded-md p-1.5 text-subtle hover:text-red-700" aria-label="Remove announcement"><Trash2Icon className="h-4 w-4" /></button>
                </li>
            )}
            </ul>
            <AdminButton size="sm" className="mt-3" icon={<PlusIcon className="h-3.5 w-3.5" />} onClick={() => set('announcements', [...draft.announcements, { id: generateId('ann'), text: '', enabled: true }])}>Add message</AdminButton>
          </Panel>

          <Panel title="Sections" description="Drag to reorder. Switch off to hide a section.">
            <Reorder.Group axis="y" values={draft.sections} onReorder={(v) => set('sections', v)} className="space-y-1.5">
              {draft.sections.map((s) =>
            <Reorder.Item key={s.id} value={s} className="flex cursor-grab items-center gap-3 rounded-lg border border-line bg-white px-3 py-2 active:cursor-grabbing">
                  <GripVerticalIcon className="h-4 w-4 text-muted" aria-hidden />
                  <span className={cn('flex-1 text-[13px] font-medium', s.enabled ? 'text-ink' : 'text-subtle line-through')}>{s.label}</span>
                  <Toggle srOnlyLabel label={`Show ${s.label}`} checked={s.enabled} onChange={(v) => set('sections', draft.sections.map((x) => x.id === s.id ? { ...x, enabled: v } : x))} />
                </Reorder.Item>
            )}
            </Reorder.Group>
          </Panel>
        </div>
      }

      {tab === 'hero' &&
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <Panel title="Hero">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminInput id="h-eyebrow" label="Small line above heading" value={draft.hero.eyebrow} onChange={(e) => set('hero', { ...draft.hero, eyebrow: e.target.value })} wrapperClassName="sm:col-span-2" />
                <AdminInput id="h-l1" label="Heading line 1" value={draft.hero.line1} onChange={(e) => set('hero', { ...draft.hero, line1: e.target.value })} />
                <AdminInput id="h-l2" label="Heading line 2" value={draft.hero.line2} onChange={(e) => set('hero', { ...draft.hero, line2: e.target.value })} />
                <AdminInput id="h-acc" label="Accent words (italic pink)" value={draft.hero.accent} onChange={(e) => set('hero', { ...draft.hero, accent: e.target.value })} wrapperClassName="sm:col-span-2" />
                <AdminTextarea id="h-text" label="Supporting text" value={draft.hero.text} onChange={(e) => set('hero', { ...draft.hero, text: e.target.value })} wrapperClassName="sm:col-span-2" className="min-h-[72px]" />
                <AdminInput id="h-cta1" label="Primary button" value={draft.hero.primaryCta} onChange={(e) => set('hero', { ...draft.hero, primaryCta: e.target.value })} />
                <AdminInput id="h-cta2" label="Secondary button" value={draft.hero.secondaryCta} onChange={(e) => set('hero', { ...draft.hero, secondaryCta: e.target.value })} />
              </div>
            </Panel>
            <Panel title="Introduction">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminInput id="i-h" label="Heading" value={draft.intro.heading} onChange={(e) => set('intro', { ...draft.intro, heading: e.target.value })} />
                <AdminInput id="i-a" label="Accent" value={draft.intro.accent} onChange={(e) => set('intro', { ...draft.intro, accent: e.target.value })} />
                <AdminTextarea id="i-t" label="Text" value={draft.intro.text} onChange={(e) => set('intro', { ...draft.intro, text: e.target.value })} wrapperClassName="sm:col-span-2" />
              </div>
            </Panel>
            <Panel title="Division cards">
              <div className="space-y-4">
                {draft.divisions.map((d, i) =>
              <div key={d.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[96px_minmax(0,1fr)]">
                    <MediaPicker value={d.image} onChange={(url) => set('divisions', draft.divisions.map((x, j) => j === i ? { ...x, image: url } : x))} label={`${d.title} image`} compact />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AdminInput id={`d-t-${d.id}`} label="Title" value={d.title} onChange={(e) => set('divisions', draft.divisions.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                      <AdminInput id={`d-c-${d.id}`} label="Button" value={d.cta} onChange={(e) => set('divisions', draft.divisions.map((x, j) => j === i ? { ...x, cta: e.target.value } : x))} />
                      <AdminInput id={`d-x-${d.id}`} label="Text" value={d.text} onChange={(e) => set('divisions', draft.divisions.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} wrapperClassName="sm:col-span-2" />
                    </div>
                  </div>
              )}
              </div>
            </Panel>
          </div>
          <Panel title="Hero image">
            <MediaPicker value={draft.hero.image} onChange={(url) => set('hero', { ...draft.hero, image: url })} label="Hero image" />
          </Panel>
        </div>
      }

      {tab === 'featured' && <FeaturedTab draft={draft} set={set} />}

      {tab === 'social' &&
      <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Why choose LUXICHIC">
            <AdminInput id="w-h" label="Heading" value={draft.why.heading} onChange={(e) => set('why', { ...draft.why, heading: e.target.value })} />
            <ul className="mt-4 space-y-3">
              {draft.why.items.map((it, i) =>
            <li key={i} className="space-y-2 rounded-lg border border-line p-3">
                  <div className="flex gap-2">
                    <input aria-label="Point title" value={it.title} onChange={(e) => set('why', { ...draft.why, items: draft.why.items.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} className={cn(adminInputClass, 'font-semibold')} />
                    <button onClick={() => set('why', { ...draft.why, items: draft.why.items.filter((_, j) => j !== i) })} className="rounded-md p-1.5 text-subtle hover:text-red-700" aria-label="Remove point"><Trash2Icon className="h-4 w-4" /></button>
                  </div>
                  <textarea aria-label="Point text" value={it.text} onChange={(e) => set('why', { ...draft.why, items: draft.why.items.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })} className={cn(adminInputClass, 'h-auto min-h-[56px] py-2')} />
                </li>
            )}
            </ul>
            <AdminButton size="sm" className="mt-3" icon={<PlusIcon className="h-3.5 w-3.5" />} onClick={() => set('why', { ...draft.why, items: [...draft.why.items, { title: '', text: '' }] })}>Add point</AdminButton>
          </Panel>
          <TestimonialsEditor list={draft.testimonials} onChange={(v) => set('testimonials', v)} />
        </div>
      }

      <SaveBar dirty={c.dirty} onSave={save} onReset={c.reset} label="Homepage changes aren’t live yet" />
    </div>);

}

function FeaturedTab({ draft, set }: {draft: Pick<SiteContent, 'featuredProductIds' | 'featuredServiceSlugs' | 'salonSection'>;set: <K extends 'featuredProductIds' | 'featuredServiceSlugs' | 'salonSection'>(k: K, v: SiteContent[K]) => void;}) {
  const products = useDb((s) => s.products.filter((p) => p.status === 'published'));
  const services = useDb((s) => s.services.filter((x) => x.status === 'published'));
  const [q, setQ] = useState('');
  const matches = products.filter((p) => !draft.featuredProductIds.includes(p.id) && p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Featured hair products" description="Drag to set the order on the homepage.">
        <Reorder.Group axis="y" values={draft.featuredProductIds} onReorder={(v) => set('featuredProductIds', v)} className="space-y-1.5">
          {draft.featuredProductIds.map((id) => {
            const p = products.find((x) => x.id === id);
            if (!p) return null;
            return (
              <Reorder.Item key={id} value={id} className="flex cursor-grab items-center gap-3 rounded-lg border border-line bg-white p-2 active:cursor-grabbing">
                <GripVerticalIcon className="h-4 w-4 text-muted" aria-hidden />
                <img src={p.images[0]} alt="" className="h-9 w-9 rounded object-cover" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{p.name}</span>
                <button onClick={() => set('featuredProductIds', draft.featuredProductIds.filter((x) => x !== id))} className="rounded-md p-1 text-subtle hover:text-red-700" aria-label={`Remove ${p.name}`}><Trash2Icon className="h-3.5 w-3.5" /></button>
              </Reorder.Item>);

          })}
        </Reorder.Group>
        <div className="mt-3">
          <label htmlFor="fp-search" className="sr-only">Add a product</label>
          <input id="fp-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products to add…" className={adminInputClass} />
          {q &&
          <ul className="mt-1.5 divide-y divide-line rounded-lg border border-line">
              {matches.length === 0 && <li className="px-3 py-2 text-xs text-subtle">No matches</li>}
              {matches.map((p) =>
            <li key={p.id}>
                  <button onClick={() => {set('featuredProductIds', [...draft.featuredProductIds, p.id]);setQ('');}} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-canvas">
                    <StarIcon className="h-3.5 w-3.5 text-gold" aria-hidden /> {p.name}
                  </button>
                </li>
            )}
            </ul>
          }
        </div>
      </Panel>
      <Panel title="Salon section">
        <div className="space-y-4">
          <AdminInput id="ss-h" label="Heading" value={draft.salonSection.heading} onChange={(e) => set('salonSection', { ...draft.salonSection, heading: e.target.value })} />
          <AdminTextarea id="ss-t" label="Text" value={draft.salonSection.text} onChange={(e) => set('salonSection', { ...draft.salonSection, text: e.target.value })} className="min-h-[64px]" />
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-charcoal">Featured services</legend>
            <div className="flex flex-wrap gap-1.5">
              {services.map((s) => {
                const on = draft.featuredServiceSlugs.includes(s.slug);
                return (
                  <button key={s.slug} type="button" aria-pressed={on} onClick={() => set('featuredServiceSlugs', on ? draft.featuredServiceSlugs.filter((x) => x !== s.slug) : [...draft.featuredServiceSlugs, s.slug])} className={cn('h-7 rounded-md border px-2.5 text-xs font-medium', on ? 'border-ink bg-ink text-white' : 'border-line text-charcoal hover:border-ink/40')}>
                    {s.name}
                  </button>);

              })}
            </div>
          </fieldset>
        </div>
      </Panel>
    </div>);

}

function TestimonialsEditor({ list, onChange }: {list: Testimonial[];onChange: (v: Testimonial[]) => void;}) {
  const patch = (id: string, p: Partial<Testimonial>) => onChange(list.map((t) => t.id === id ? { ...t, ...p } : t));
  return (
    <Panel title="Testimonials" description="Archived testimonials are hidden from the carousel.">
      <ul className="space-y-3">
        {list.map((t) =>
        <li key={t.id} className={cn('space-y-2 rounded-lg border border-line p-3', t.status === 'archived' && 'opacity-60')}>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-[11px] font-bold">{t.initials || initials(t.name)}</span>
              <input aria-label="Customer name" value={t.name} onChange={(e) => patch(t.id, { name: e.target.value, initials: initials(e.target.value) })} className={cn(adminInputClass, 'h-8')} />
              <select aria-label="Rating" value={t.rating} onChange={(e) => patch(t.id, { rating: Number(e.target.value) })} className={cn(adminInputClass, 'h-8 w-20')}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}★</option>)}
              </select>
            </div>
            <input aria-label="Product or service" value={t.item} onChange={(e) => patch(t.id, { item: e.target.value })} placeholder="Product or service" className={cn(adminInputClass, 'h-8')} />
            <textarea aria-label="Testimonial" value={t.text} onChange={(e) => patch(t.id, { text: e.target.value })} className={cn(adminInputClass, 'h-auto min-h-[64px] py-2')} />
            <div className="flex justify-between">
              <Toggle label="Show on homepage" checked={t.status === 'active'} onChange={(v) => patch(t.id, { status: v ? 'active' : 'archived' })} />
              <button onClick={() => onChange(list.filter((x) => x.id !== t.id))} className="text-xs font-semibold text-subtle hover:text-red-700">Delete</button>
            </div>
          </li>
        )}
      </ul>
      <AdminButton size="sm" className="mt-3" icon={<PlusIcon className="h-3.5 w-3.5" />} onClick={() => onChange([...list, { id: generateId('t'), name: '', initials: '', rating: 5, item: '', text: '', status: 'active' }])}>Add testimonial</AdminButton>
    </Panel>);

}