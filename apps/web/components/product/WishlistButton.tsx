'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HeartIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWishlist } from '@/contexts/WishlistContext';
import { cn } from '@/lib/utils/cn';

interface WishlistButtonProps {
  productId: string;
  productName: string;
  withLabel?: boolean;
  className?: string;
}

export function WishlistButton({ productId, productName, withLabel, className }: WishlistButtonProps) {
  const { has, toggle } = useWishlist();
  const router = useRouter();
  const pathname = usePathname();
  const active = has(productId);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = toggle(productId);
    if (result === 'loading') return;
    if (result === 'sign-in') {
      toast('Sign in to save to your wishlist', {
        description: `We'll keep ${productName} for you once you're signed in.`,
        action: { label: 'Sign in', onClick: () => router.push(`/login?redirect=${encodeURIComponent(pathname)}`) },
      });
      return;
    }
    toast(result === 'added' ? 'Saved to your wishlist' : 'Removed from your wishlist', { description: productName });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full transition-colors duration-150',
        withLabel
          ? 'h-14 border border-line px-5 text-xs font-bold uppercase tracking-[0.14em] hover:border-ink'
          : 'h-9 w-9 bg-white/90 hover:bg-white',
        className,
      )}
    >
      <motion.span
        key={String(active)}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      >
        <HeartIcon
          className={cn('h-4 w-4', active ? 'text-pink-deep' : 'text-ink')}
          fill={active ? 'currentColor' : 'none'}
          aria-hidden
        />
      </motion.span>
      {withLabel && (active ? 'Saved' : 'Wishlist')}
    </button>
  );
}
