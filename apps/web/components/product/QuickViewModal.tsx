'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, XIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Stars } from '@/components/ui/Stars';
import { Button } from '@/components/ui/Button';
import { PriceTag } from '@/components/product/PriceTag';
import { VariantSelector } from '@/components/product/VariantSelector';
import { QuantitySelector } from '@/components/product/QuantitySelector';
import { WishlistButton } from '@/components/product/WishlistButton';
import { useUI } from '@/contexts/UIContext';
import { useAddToCart } from '@/hooks/useAddToCart';
import { defaultSelection, divisionLabel, priceForSelection } from '@/lib/utils/products';

export function QuickViewModal() {
  const { quickView: product, setQuickView } = useUI();
  const addToCart = useAddToCart();
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (product) {
      setSelection(defaultSelection(product));
      setQty(1);
    }
  }, [product]);

  const close = () => setQuickView(null);
  const priced = product ? priceForSelection(product, selection) : null;

  return (
    <Modal open={!!product} onClose={close} title={product?.name ?? 'Quick view'} hideTitle>
      {product && priced && (
        <div className="grid md:grid-cols-2">
          <div className="aspect-[4/5] bg-ivory md:aspect-auto">
            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-semibold text-pink-deep">{divisionLabel(product.division)}</p>
              <button
                onClick={close}
                className="-mr-2 -mt-2 rounded-full p-2 text-subtle hover:bg-ivory hover:text-ink"
                aria-label="Close quick view"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <h2 className="mt-2 font-display text-3xl leading-tight text-ink">{product.name}</h2>
            <div className="mt-2 flex items-center gap-2 text-xs text-subtle">
              <Stars rating={product.rating} /> {product.rating.toFixed(1)} · {product.reviewCount} reviews
            </div>
            <PriceTag price={priced.price} original={priced.original} size="lg" className="mt-4" />
            <p className="mt-3 text-sm leading-relaxed text-charcoal">{product.shortDescription}</p>
            <div className="mt-6">
              <VariantSelector
                product={product}
                selection={selection}
                onChange={(k, v) => setSelection((s) => ({ ...s, [k]: v }))}
              />
            </div>
            <p className={`mt-4 text-xs ${priced.stock > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {priced.stock > 0
                ? priced.stock <= 5
                  ? `Only ${priced.stock} left in this option`
                  : 'In stock'
                : 'Out of stock'}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <QuantitySelector value={qty} onChange={setQty} max={Math.max(1, priced.stock)} />
              <Button
                className="flex-1"
                disabled={priced.stock <= 0}
                onClick={() => {
                  addToCart(product, selection, qty);
                  close();
                }}
              >
                Add to Cart
              </Button>
              <WishlistButton
                productId={product.id}
                productName={product.name}
                className="h-11 w-11 border border-line"
              />
            </div>
            <Link
              href={`/${product.division}/product/${product.slug}`}
              onClick={close}
              className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink hover:text-pink-deep"
            >
              View full details <ArrowRightIcon className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
