'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';

/**
 * Sticky bar that appears when a form has unsaved edits. While it shows, leaving the page (a link, reload or
 * closing the tab) asks first, so edits aren't lost by accident.
 */
export function SaveBar({
  dirty,
  onSave,
  onReset,
  saving,
  label = 'Unsaved changes',
}: {
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
  saving?: boolean;
  label?: string;
}) {
  useUnsavedGuard(dirty);

  return (
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:left-auto lg:w-[calc(100%-15rem)]"
        >
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <p className="text-[13px] text-charcoal">{label}</p>
            <div className="flex gap-2">
              <AdminButton variant="ghost" onClick={onReset}>
                Discard
              </AdminButton>
              <AdminButton variant="primary" onClick={onSave} loading={saving}>
                Save &amp; publish
              </AdminButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
