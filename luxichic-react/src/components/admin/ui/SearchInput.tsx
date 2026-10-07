import React from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder, label = 'Search', className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-line bg-white pl-8 pr-8 text-[13px] placeholder:text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 [&::-webkit-search-cancel-button]:hidden" />
      
      {value &&
      <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-subtle hover:text-ink" aria-label="Clear search">
          <XIcon className="h-3.5 w-3.5" />
        </button>
      }
    </div>);

}