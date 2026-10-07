import React, { useEffect, useRef } from 'react';
import { BoldIcon, Heading2Icon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon } from 'lucide-react';

interface RichTextEditorProps {
  id: string;
  label: string;
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
}

const tools = [
{ cmd: 'formatBlock', arg: 'h3', icon: Heading2Icon, label: 'Heading' },
{ cmd: 'bold', icon: BoldIcon, label: 'Bold' },
{ cmd: 'italic', icon: ItalicIcon, label: 'Italic' },
{ cmd: 'insertUnorderedList', icon: ListIcon, label: 'Bullet list' },
{ cmd: 'insertOrderedList', icon: ListOrderedIcon, label: 'Numbered list' },
{ cmd: 'createLink', icon: LinkIcon, label: 'Link' }];


/**
 * Lightweight rich text editor (headings, bold, italic, lists, links).
 * Output is HTML; sanitise server-side before rendering it publicly.
 */
export function RichTextEditor({ id, label, value, onChange, minHeight = 140 }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);

  const run = (cmd: string, arg?: string) => {
    ref.current?.focus();
    if (cmd === 'createLink') {
      const url = window.prompt('Link URL', 'https://');
      if (!url) return;
      document.execCommand(cmd, false, url);
    } else {
      document.execCommand(cmd, false, arg);
    }
    onChange(ref.current?.innerHTML ?? '');
  };

  return (
    <div>
      <p id={`${id}-label`} className="mb-1 text-xs font-semibold text-charcoal">{label}</p>
      <div className="overflow-hidden rounded-lg border border-line bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10">
        <div className="flex gap-0.5 border-b border-line bg-canvas/60 p-1" role="toolbar" aria-label={`${label} formatting`}>
          {tools.map((t) =>
          <button
            key={t.label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(t.cmd, t.arg)}
            className="rounded-md p-1.5 text-charcoal transition-colors duration-150 hover:bg-white hover:text-ink"
            aria-label={t.label}
            title={t.label}>
            
              <t.icon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div
          id={id}
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={`${id}-label`}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          className="prose-admin px-3 py-2 text-[13px] leading-relaxed text-ink outline-none"
          style={{ minHeight }} />
        
      </div>
    </div>);

}