import React, { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

interface CountUpProps {
  value: number;
  format?: (n: number) => string;
}

/** Animates a metric from its previous value; respects reduced motion. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString() }: CountUpProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const prev = useRef(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (v) => setDisplay(v)
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return <span className="tabular-nums">{format(display)}</span>;
}