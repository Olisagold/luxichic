'use client';

import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Target, type TargetAndTransition } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Side = 'center' | 'right' | 'left' | 'bottom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  hideTitle?: boolean;
  side?: Side;
  dark?: boolean;
  className?: string;
  children: React.ReactNode;
}

const ease = [0.23, 1, 0.32, 1] as const;

const panelMotion: Record<Side, { initial: Target; animate: TargetAndTransition }> = {
  center: { initial: { opacity: 0, scale: 0.96, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 } },
  right: { initial: { x: '100%' }, animate: { x: 0 } },
  left: { initial: { x: '-100%' }, animate: { x: 0 } },
  bottom: { initial: { y: '100%' }, animate: { y: 0 } },
};

const panelClass: Record<Side, string> = {
  center: 'relative m-auto max-h-[92vh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-[28px]',
  right: 'absolute inset-y-0 right-0 flex w-full max-w-md flex-col',
  left: 'absolute inset-y-0 left-0 flex w-full max-w-sm flex-col',
  bottom: 'absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[28px]',
};

export function Modal({ open, onClose, title, hideTitle, side = 'center', dark, className, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onClose = () => closeRef.current();
    const previous = document.activeElement as HTMLElement | null;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    // Move focus into the dialog, unless a field inside already has it (autoFocus).
    const t = setTimeout(() => {
      if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    }, 20);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
      previous?.focus?.();
    };
  }, [open]);

  const m = panelMotion[side];

  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn('fixed inset-0 z-[80]', side === 'center' && 'flex')}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            className="absolute inset-0 bg-ink/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className={cn(
              panelClass[side],
              dark ? 'bg-ink text-white' : 'bg-white text-charcoal',
              'shadow-lift outline-none',
              className,
            )}
            initial={reduce ? { opacity: 0 } : m.initial}
            animate={reduce ? { opacity: 1 } : m.animate}
            exit={reduce ? { opacity: 0 } : m.initial}
            transition={{ duration: side === 'center' ? 0.22 : 0.28, ease }}
          >
            {!hideTitle && (
              <div
                className={cn(
                  'flex shrink-0 items-center justify-between px-6 py-5',
                  dark ? 'border-b border-white/10' : 'border-b border-line',
                )}
              >
                <h2 className="font-display text-2xl">{title}</h2>
                <button
                  onClick={onClose}
                  className={cn(
                    'rounded-full p-2 transition-colors duration-150',
                    dark ? 'hover:bg-white/10' : 'hover:bg-ivory',
                  )}
                  aria-label="Close"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
