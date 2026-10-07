'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from 'lucide-react';
import type { Division } from '@/types/product';
import { useUI } from '@/contexts/UIContext';

export function StoreSearch({ division, placeholder }: {division: Division;placeholder: string;}) {
  const [q, setQ] = useState('');
  const router = useRouter();
  const { addRecentSearch } = useUI();

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.trim()) return;
        addRecentSearch(q);
        router.push(`/search?q=${encodeURIComponent(q.trim())}&scope=${division}`);
      }}
      className="flex w-full max-w-lg items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-5">
      
      <SearchIcon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
      <label htmlFor={`store-search-${division}`} className="sr-only">Search this store</label>
      <input
        id={`store-search-${division}`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none" />
      
      <button type="submit" className="h-10 shrink-0 rounded-full bg-ink px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors duration-150 hover:bg-charcoal">
        Search
      </button>
    </form>);

}