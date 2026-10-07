'use client';

import React from 'react';
import Link from 'next/link';
import { HeartIcon, ShoppingBagIcon, XIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PriceTag } from '@/components/product/PriceTag';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAddToCart } from '@/hooks/useAddToCart';
import { divisionLabel, findProductById } from '@/lib/utils/products';
import type { Product } from '@/types/product';

export function WishlistGrid() {
  const { ids, remove } = useWishlist();
  const addToCart = useAddToCart();
  const products = ids.map(findProductById).filter((p): p is Product => !!p);

  if (!products.length) {
    return (
      <EmptyState
        icon={<HeartIcon className="h-7 w-7" />}
        title="Your wishlist is empty"
        text="Tap the heart on any product to save it here — from either store."
        actions={
        <>
            <Button to="/hairs">Shop LUXICHIC Hairs</Button>
            <Button to="/tools" variant="outline">Shop Hair Tools</Button>
          </>
        } />);


  }

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p) =>
      <li key={p.id} className="flex flex-col">
          <div className="relative overflow-hidden rounded-2xl bg-champagne/40">
            <Link href={`/${p.division}/product/${p.slug}`}>
              <img src={p.images[0]} alt={p.name} className="aspect-[4/5] w-full object-cover" />
            </Link>
            <button onClick={() => remove(p.id)} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-soft" aria-label={`Remove ${p.name} from wishlist`}>
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">{divisionLabel(p.division)}</p>
          <Link href={`/${p.division}/product/${p.slug}`} className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-ink hover:text-pink-deep">{p.name}</Link>
          <PriceTag price={p.price} original={p.originalPrice} className="mt-1" />
          <div className="mt-auto pt-3">
            <Button size="sm" fullWidth disabled={p.stock <= 0} onClick={() => addToCart(p)}>
              <ShoppingBagIcon className="h-3.5 w-3.5" aria-hidden /> {p.stock <= 0 ? 'Sold Out' : 'Add to Cart'}
            </Button>
          </div>
        </li>
      )}
    </ul>);

}