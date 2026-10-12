'use client';

import React from 'react';
import { toast } from 'sonner';
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useContentDraft } from '@/hooks/useContentDraft';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { adminInputClass } from '@/components/admin/ui/AdminField';
import { SaveBar } from '@/components/admin/content/SaveBar';
import { cn } from '@/lib/utils/cn';

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function FaqContent() {
  const c = useContentDraft(['faqs']);
  const faqs = c.draft.faqs;
  const setFaqs = (v: typeof faqs) => c.set('faqs', v);
  const patchCat = (ci: number, p: Partial<(typeof faqs)[number]>) =>
    setFaqs(faqs.map((x, i) => (i === ci ? { ...x, ...p } : x)));

  return (
    <div className="pb-20">
      <PageHeader
        title="FAQs"
        description="Questions grouped by topic. Use the arrows to change the order."
        actions={
          <>
            <AdminButton icon={<ExternalLinkIcon className="h-4 w-4" />} onClick={() => window.open('/faq', '_blank')}>
              View page
            </AdminButton>
            <AdminButton
              variant="primary"
              icon={<PlusIcon className="h-4 w-4" />}
              onClick={() => setFaqs([...faqs, { category: 'New topic', items: [{ q: '', a: '' }] }])}
            >
              Add topic
            </AdminButton>
          </>
        }
      />

      <div className="space-y-5">
        {faqs.map((cat, ci) => (
          <section key={ci} className="rounded-xl border border-line bg-white">
            <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
              <input
                aria-label="Topic name"
                value={cat.category}
                onChange={(e) => patchCat(ci, { category: e.target.value })}
                className="h-8 min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none"
              />
              <button
                onClick={() => setFaqs(move(faqs, ci, -1))}
                className="rounded-md p-1 text-subtle hover:bg-canvas"
                aria-label="Move topic up"
              >
                <ChevronUpIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setFaqs(move(faqs, ci, 1))}
                className="rounded-md p-1 text-subtle hover:bg-canvas"
                aria-label="Move topic down"
              >
                <ChevronDownIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setFaqs(faqs.filter((_, i) => i !== ci))}
                className="rounded-md p-1 text-subtle hover:text-red-700"
                aria-label="Delete topic"
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            </header>
            <ul className="divide-y divide-line">
              {cat.items.map((it, qi) => (
                <li key={qi} className="flex gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      aria-label="Question"
                      value={it.q}
                      placeholder="Question"
                      onChange={(e) =>
                        patchCat(ci, { items: cat.items.map((x, j) => (j === qi ? { ...x, q: e.target.value } : x)) })
                      }
                      className={cn(adminInputClass, 'font-semibold')}
                    />
                    <textarea
                      aria-label="Answer"
                      value={it.a}
                      placeholder="Answer"
                      onChange={(e) =>
                        patchCat(ci, { items: cat.items.map((x, j) => (j === qi ? { ...x, a: e.target.value } : x)) })
                      }
                      className={cn(adminInputClass, 'h-auto min-h-[64px] py-2')}
                    />
                  </div>
                  <div className="flex flex-col">
                    <button
                      onClick={() => patchCat(ci, { items: move(cat.items, qi, -1) })}
                      className="rounded-md p-1 text-subtle hover:bg-canvas"
                      aria-label="Move question up"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => patchCat(ci, { items: move(cat.items, qi, 1) })}
                      className="rounded-md p-1 text-subtle hover:bg-canvas"
                      aria-label="Move question down"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => patchCat(ci, { items: cat.items.filter((_, j) => j !== qi) })}
                      className="rounded-md p-1 text-subtle hover:text-red-700"
                      aria-label="Delete question"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2.5">
              <AdminButton
                size="xs"
                icon={<PlusIcon className="h-3 w-3" />}
                onClick={() => patchCat(ci, { items: [...cat.items, { q: '', a: '' }] })}
              >
                Add question
              </AdminButton>
            </div>
          </section>
        ))}
      </div>
      <SaveBar
        dirty={c.dirty}
        onReset={c.reset}
        saving={c.saving}
        onSave={async () => {
          const cleaned = faqs
            .map((f) => ({ ...f, items: f.items.filter((i) => i.q.trim() && i.a.trim()) }))
            .filter((f) => f.category.trim() && f.items.length);
          if (await c.save({ faqs: cleaned })) {
            toast.success('FAQs published', { description: 'Empty questions were removed.' });
          }
        }}
      />
    </div>
  );
}
