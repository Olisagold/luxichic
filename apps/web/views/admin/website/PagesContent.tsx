'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { ExternalLinkIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useActor } from '@/hooks/useActor';
import { useContentDraft } from '@/hooks/useContentDraft';
import { updateContent } from '@/lib/mock-db/settings';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminTextarea, adminInputClass } from '@/components/admin/ui/AdminField';
import { SaveBar } from '@/components/admin/content/SaveBar';
import { cn } from '@/lib/utils/cn';

/** Contact page intro and the legal / policy pages. */
export function PagesContent() {
  const actor = useActor();
  const c = useContentDraft(['contact', 'policies']);
  const { contact, policies } = c.draft;
  const keys = Object.keys(policies);
  const [active, setActive] = useState<string>('contact');
  const policy = policies[active];
  const setPolicy = (p: Partial<typeof policy>) => c.set('policies', { ...policies, [active]: { ...policy, ...p } });

  const save = () => {
    c.changedKeys().forEach((k) =>
      updateContent(actor, k, c.draft[k] as never, k === 'contact' ? 'Updated contact page' : 'Updated policies'),
    );
    c.markSaved();
    toast.success('Pages published');
  };

  return (
    <div className="pb-20">
      <PageHeader
        title="Contact & policies"
        description="Edit the contact page intro and every policy page customers can read."
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Pages" className="rounded-xl border border-line bg-white p-1.5 lg:self-start">
          {[['contact', 'Contact page'], ...keys.map((k) => [k, policies[k].title])].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setActive(k)}
              aria-current={active === k}
              className={cn(
                'block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium',
                active === k ? 'bg-ink text-white' : 'text-charcoal hover:bg-canvas',
              )}
            >
              {l}
            </button>
          ))}
        </nav>

        {active === 'contact' ? (
          <Panel
            title="Contact page"
            actions={
              <AdminButton
                size="sm"
                icon={<ExternalLinkIcon className="h-3.5 w-3.5" />}
                onClick={() => window.open('/contact', '_blank')}
              >
                View
              </AdminButton>
            }
          >
            <div className="space-y-4">
              <AdminInput
                id="ct-h"
                label="Heading"
                value={contact.heading}
                onChange={(e) => c.set('contact', { ...contact, heading: e.target.value })}
              />
              <AdminTextarea
                id="ct-t"
                label="Introduction"
                value={contact.text}
                onChange={(e) => c.set('contact', { ...contact, text: e.target.value })}
              />
              <p className="rounded-lg bg-canvas px-3 py-2 text-xs text-subtle">
                Phone, email, address, hours and WhatsApp come from Settings → Business information.
              </p>
            </div>
          </Panel>
        ) : policy ? (
          <Panel
            title={policy.title}
            actions={
              <AdminButton
                size="sm"
                icon={<ExternalLinkIcon className="h-3.5 w-3.5" />}
                onClick={() => window.open(`/policies/${active}`, '_blank')}
              >
                View
              </AdminButton>
            }
          >
            <AdminInput
              id="pol-title"
              label="Page title"
              value={policy.title}
              onChange={(e) => setPolicy({ title: e.target.value })}
            />
            <ul className="mt-4 space-y-3">
              {policy.sections.map((s, i) => (
                <li key={i} className="space-y-2 rounded-lg border border-line p-3">
                  <div className="flex gap-2">
                    <input
                      aria-label="Section heading"
                      value={s.heading}
                      onChange={(e) =>
                        setPolicy({
                          sections: policy.sections.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)),
                        })
                      }
                      className={cn(adminInputClass, 'font-semibold')}
                    />
                    <button
                      onClick={() => setPolicy({ sections: policy.sections.filter((_, j) => j !== i) })}
                      className="rounded-md p-1.5 text-subtle hover:text-red-700"
                      aria-label="Remove section"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    aria-label="Section text"
                    value={s.body}
                    onChange={(e) =>
                      setPolicy({
                        sections: policy.sections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)),
                      })
                    }
                    className={cn(adminInputClass, 'h-auto min-h-[100px] py-2')}
                  />
                </li>
              ))}
            </ul>
            <AdminButton
              size="sm"
              className="mt-3"
              icon={<PlusIcon className="h-3.5 w-3.5" />}
              onClick={() => setPolicy({ sections: [...policy.sections, { heading: '', body: '' }] })}
            >
              Add section
            </AdminButton>
          </Panel>
        ) : null}
      </div>
      <SaveBar dirty={c.dirty} onSave={save} onReset={c.reset} />
    </div>
  );
}
