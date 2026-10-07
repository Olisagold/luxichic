import React from 'react';
import { toast } from 'sonner';
import { ExternalLinkIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useActor } from '../../../hooks/useActor';
import { useContentDraft } from '../../../hooks/useContentDraft';
import { updateContent } from '../../../services/settings';
import { PageHeader } from '../../../components/admin/ui/PageHeader';
import { Panel } from '../../../components/admin/ui/Panel';
import { AdminButton } from '../../../components/admin/ui/AdminButton';
import { AdminInput, AdminTextarea, adminInputClass } from '../../../components/admin/ui/AdminField';
import { SaveBar } from '../../../components/admin/content/SaveBar';
import { MediaPicker } from '../../../components/admin/content/MediaPicker';
import { cn } from '../../../utils/cn';

export function AboutContent() {
  const actor = useActor();
  const c = useContentDraft(['about']);
  const a = c.draft.about;
  const set = (p: Partial<typeof a>) => c.set('about', { ...a, ...p });

  return (
    <div className="pb-20">
      <PageHeader title="About page" description="Tell LUXICHIC’s story, mission and values." actions={<AdminButton icon={<ExternalLinkIcon className="h-4 w-4" />} onClick={() => window.open('/about', '_blank')}>View page</AdminButton>} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Panel title="Story">
            <div className="space-y-4">
              <AdminInput id="ab-title" label="Title" value={a.title} onChange={(e) => set({ title: e.target.value })} />
              <AdminTextarea id="ab-intro" label="Introduction" value={a.intro} onChange={(e) => set({ intro: e.target.value })} className="min-h-[72px]" />
              <AdminTextarea id="ab-desc" label="Business description" value={a.description} onChange={(e) => set({ description: e.target.value })} className="min-h-[120px]" />
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminTextarea id="ab-mission" label="Mission" value={a.mission} onChange={(e) => set({ mission: e.target.value })} />
                <AdminTextarea id="ab-vision" label="Vision" value={a.vision} onChange={(e) => set({ vision: e.target.value })} />
              </div>
              <AdminInput id="ab-cta" label="Call-to-action button" value={a.cta} onChange={(e) => set({ cta: e.target.value })} />
            </div>
          </Panel>
          <Panel title="Values">
            <ul className="space-y-3">
              {a.values.map((v, i) =>
              <li key={i} className="space-y-2 rounded-lg border border-line p-3">
                  <div className="flex gap-2">
                    <input aria-label="Value title" value={v.title} onChange={(e) => set({ values: a.values.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} className={cn(adminInputClass, 'font-semibold')} />
                    <button onClick={() => set({ values: a.values.filter((_, j) => j !== i) })} className="rounded-md p-1.5 text-subtle hover:text-red-700" aria-label="Remove value"><Trash2Icon className="h-4 w-4" /></button>
                  </div>
                  <textarea aria-label="Value text" value={v.text} onChange={(e) => set({ values: a.values.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })} className={cn(adminInputClass, 'h-auto min-h-[56px] py-2')} />
                </li>
              )}
            </ul>
            <AdminButton size="sm" className="mt-3" icon={<PlusIcon className="h-3.5 w-3.5" />} onClick={() => set({ values: [...a.values, { title: '', text: '' }] })}>Add value</AdminButton>
          </Panel>
        </div>
        <Panel title="Image"><MediaPicker value={a.image} onChange={(url) => set({ image: url })} label="About image" /></Panel>
      </div>
      <SaveBar dirty={c.dirty} onReset={c.reset} onSave={() => {updateContent(actor, 'about', a, 'Updated About page');c.markSaved();toast.success('About page published');}} />
    </div>);

}