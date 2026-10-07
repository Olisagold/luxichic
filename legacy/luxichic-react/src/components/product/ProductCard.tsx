import React from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, ShoppingBagIcon } from 'lucide-react';
import type { Product } from '../../types/product';
import { Stars } from '../ui/Stars';
import { PriceTag } from './PriceTag';
import { WishlistButton } from './WishlistButton';
import { useAddToCart } from '../../hooks/useAddToCart';
import { useUI } from '../../contexts/UIContext';
import { discountPercent } from '../../utils/currency';
import { cn } from '../../utils/cn';

export function ProductCard({ product, dark }: {product: Product;dark?: boolean;}) {
  const addToCart = useAddToCart();
  const { setQuickView } = useUI();
  const off = discountPercent(product.price, product.originalPrice);
  const soldOut = product.stock <= 0;
  const url = `/${product.division}/product/${product.slug}`;

  return (
    <article className="group flex h-full flex-col">
      <div className="relative overflow-hidden rounded-2xl bg-champagne/40">
        <Link to={url} tabIndex={-1} aria-hidden>
          <img
            src={product.images[0]}
            alt=""
            loading="lazy"
            className={cn('aspect-[4/5] w-full object-cover transition-transform duration-300 ease-lux group-hover:scale-[1.04]', soldOut && 'opacity-70')} />
          
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {off && <span className="rounded-full bg-pink px-2.5 py-1 text-[10px] font-bold text-ink">−{off}%</span>}
          {product.isNew && <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink">New</span>}
          {soldOut && <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Sold out</span>}
        </div>
        <WishlistButton productId={product.id} productName={product.name} className="absolute right-3 top-3 shadow-soft" />
        <button
          type="button"
          onClick={() => setQuickView(product)}
          className="absolute inset-x-3 bottom-3 flex h-10 items-center justify-center gap-2 rounded-full bg-white/95 text-[11px] font-bold uppercase tracking-[0.14em] text-ink opacity-100 shadow-soft transition-[opacity,transform] duration-200 ease-lux md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100"
          aria-label={`Quick view ${product.name}`}>
          
          <EyeIcon className="h-4 w-4" aria-hidden /> Quick View
        </button>
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <h3 className={cn('line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5', dark ? 'text-white' : 'text-ink')}>
          <Link to={url} className="transition-colors duration-150 hover:text-pink-deep">
            {product.name}
          </Link>
        </h3>
        <div className={cn('mt-1.5 flex items-center gap-1.5 text-xs', dark ? 'text-white/60' : 'text-subtle')}>
          <Stars rating={product.rating} />
          <span className="tabular-nums">
            {product.rating.toFixed(1)} ({product.reviewCount})
          </span>
        </div>
        <PriceTag price={product.price} original={product.originalPrice} light={dark} className="mt-2" />
        <p className={cn('mt-1 text-xs', soldOut ? 'text-red-700' : product.stock <= 5 ? 'text-[#8a6d3b]' : dark ? 'text-white/60' : 'text-subtle')}>
          {soldOut ? 'Out of stock' : product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}
        </p>
        <div className="mt-auto pt-4">
          <button
            type="button"
            disabled={soldOut}
            onClick={() => addToCart(product)}
            className={cn(
              'flex h-10 w-full items-center justify-center gap-2 rounded-full border text-[11px] font-bold uppercase tracking-[0.14em]',
              'transition-[background-color,color,transform] duration-200 ease-lux active:scale-[0.98] disabled:opacity-40',
              dark ? 'border-white/40 text-white hover:bg-white hover:text-ink' : 'border-ink text-ink hover:bg-ink hover:text-white'
            )}>
            
            <ShoppingBagIcon className="h-4 w-4" aria-hidden />
            {soldOut ? 'Sold Out' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </article>);

}