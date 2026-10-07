import React from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import type { ProductEditorState } from '../../../hooks/useProductEditor';
import { Panel } from '../ui/Panel';
import { AdminButton } from '../ui/AdminButton';
import { adminInputClass } from '../ui/AdminField';
import { cn } from '../../../utils/cn';

const suggestions = {
  hairs: ['Hair Type', 'Hair Origin', 'Texture', 'Length', 'Density', 'Lace Type', 'Cap Size', 'Colour', 'Weight'],
  tools: ['Brand', 'Material', 'Power Rating', 'Heat Settings', 'Speed Settings', 'Attachments', 'Size', 'Compatibility', 'Package Contents', 'Weight']
};

export function SpecsSection({ editor }: {editor: ProductEditorState;}) {
  const { draft, update } = editor;
  const unused = suggestions[draft.division].filter((s) => !draft.specs.some((x) => x.label === s));

  return (
    <Panel title="Specifications" description="Only add specifications that apply to this product.">
      {draft.specs.length > 0 &&
      <ul className="mb-3 space-y-2">
          {draft.specs.map((s, i) =>
        <li key={i} className="flex gap-2">
              <input aria-label="Specification name" value={s.label} onChange={(e) => update({ specs: draft.specs.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} className={cn(adminInputClass, 'w-40 font-semibold sm:w-48')} />
              <input aria-label={`${s.label} value`} value={s.value} onChange={(e) => update({ specs: draft.specs.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} className={cn(adminInputClass, 'flex-1')} placeholder="Value" />
              <button type="button" onClick={() => update({ specs: draft.specs.filter((_, j) => j !== i) })} className="rounded-md px-2 text-subtle hover:text-red-700" aria-label={`Remove ${s.label}`}>
                <XIcon className="h-4 w-4" />
              </button>
            </li>
        )}
        </ul>
      }
      <div className="flex flex-wrap gap-1.5">
        <AdminButton size="xs" variant="primary" icon={<PlusIcon className="h-3 w-3" />} onClick={() => update({ specs: [...draft.specs, { label: '', value: '' }] })}>Custom field</AdminButton>
        {unused.map((s) =>
        <button key={s} type="button" onClick={() => update({ specs: [...draft.specs, { label: s, value: '' }] })} className="h-7 rounded-md border border-dashed border-line px-2 text-xs text-subtle hover:border-ink/40 hover:text-ink">
            + {s}
          </button>
        )}
      </div>
    </Panel>);

}