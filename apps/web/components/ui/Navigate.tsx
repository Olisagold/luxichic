'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Client-side redirect for guards that can only decide after reading browser state. */
export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [router, to, replace]);

  return null;
}
