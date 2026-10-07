import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { announcements, siteContent } from '../../data/content';

export function AnnouncementBar() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % Math.max(1, announcements.length)), 4500);
    return () => clearInterval(id);
  }, []);

  if (!siteContent.sections.includes('announcement') || announcements.length === 0) return null;

  return (
    <div className="bg-blush text-ink" role="region" aria-label="Announcements">
      <div className="relative mx-auto flex h-9 max-w-7xl items-center justify-center overflow-hidden px-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={i}
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            aria-live="polite">
            
            {announcements[i % announcements.length]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>);

}