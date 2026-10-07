import React, { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Accordion({ items }: {items: {q: string;a: string;}[];}) {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();

  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.q}>
            <h3>
              <button
                id={`${baseId}-h-${i}`}
                aria-expanded={isOpen}
                aria-controls={`${baseId}-p-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-[15px] font-semibold text-ink">
                
                {item.q}
                <PlusIcon className={cn('h-5 w-5 shrink-0 transition-transform duration-200 ease-lux', isOpen && 'rotate-45')} aria-hidden />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen &&
              <motion.div
                id={`${baseId}-p-${i}`}
                role="region"
                aria-labelledby={`${baseId}-h-${i}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden">
                
                  <p className="max-w-3xl pb-5 text-sm leading-relaxed text-subtle">{item.a}</p>
                </motion.div>
              }
            </AnimatePresence>
          </li>);

      })}
    </ul>);

}