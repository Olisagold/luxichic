'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Share2Icon, ShieldCheckIcon, TruckIcon, ZapIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Division } from '@/types/product';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Stars } from '@/components/ui/Stars';
import { Button } from '@/components/ui/Button';
import { ProductGallery } from '@/components/product/ProductGallery';
import { PriceTag } from '@/components/product/PriceTag';
import { VariantSelector } from '@/components/product/VariantSelector';
import { QuantitySelector } from '@/components/product/QuantitySelector';
import { WishlistButton } from '@/components/product/WishlistButton';
import { ProductTabs } from '@/components/product/ProductTabs';
import { ProductRail } from '@/components/store/ProductRail';
import { useAddToCart, toCartItem } from '@/hooks/useAddToCart';
import { useCart } from '@/contexts/CartContext';
import { defaultSelection, divisionLabel, findProduct, priceForSelection, relatedProducts } from '@/lib/utils/products';
import { discountPercent } from '@/lib/utils/currency';
import { businessConfig } from '@/data/config';
import { NotFound } from '@/views/info/NotFound';

export function ProductDetail({ division }: {division: Division;}) {
  const { slug } = useParams<{ slug: string }>();
  const product = findProduct(slug);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const addToCart = useAddToCart();
  const { setBuyNowItem } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (product) {
      setSelection(defaultSelection(product));
      setQty(1);
    }
  }, [product]);

  if (!product || product.division !== division) return <NotFound />;

  const priced = priceForSelection(product, selection);
  const off = discountPercent(priced.price, priced.original);
  const storeHome = `/${division}`;
  const lowStock = priced.stock > 0 && priced.stock <= 5;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });else
      {
        await navigator.clipboard.writeText(url);
        toast.success('Product link copied to your clipboard');
      }
    } catch {

      /* dismissed */}
  };

  const buyNow = () => {
    if (priced.stock <= 0) return;
    setBuyNowItem(toCartItem(product, selection, qty));
    router.push('/checkout?mode=buynow');
  };

  return (
    <div className="bg-ivory">
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-8 lg:px-8">
        <Breadcrumbs
          items={[
          { label: 'Home', to: '/' },
          { label: divisionLabel(division), to: storeHome },
          { label: 'Shop', to: `${storeHome}/shop/all` },
          { label: product.name }]
          } />
        
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <ProductGallery images={product.images} name={product.name} />

          <div className="lg:pt-4">
            <p className="text-xs font-semibold text-pink-deep">{divisionLabel(division)}</p>
            <h1 className="mt-2 font-display text-4xl leading-[1.05] text-ink md:text-5xl">{product.name}</h1>
            <a href="#product-tabs" className="mt-3 inline-flex items-center gap-2 text-sm text-subtle hover:text-ink">
              <Stars rating={product.rating} size="md" />
              <span className="tabular-nums">{product.rating.toFixed(1)}</span> · {product.reviewCount} reviews
            </a>

            <div className="mt-6 flex items-center gap-3">
              <PriceTag price={priced.price} original={priced.original} size="lg" />
              {off && <span className="rounded-full bg-pink px-2.5 py-1 text-xs font-bold text-ink">Save {off}%</span>}
            </div>
            {businessConfig.pricesAreSamples && <p className="mt-1 text-xs text-subtle">Sample price — final pricing to be confirmed.</p>}

            <p className="mt-6 text-[15px] leading-relaxed text-charcoal">{product.shortDescription}</p>

            <div className="mt-8">
              <VariantSelector product={product} selection={selection} onChange={(k, v) => setSelection((s) => ({ ...s, [k]: v }))} />
            </div>

            <p className={`mt-6 text-sm font-medium ${priced.stock <= 0 ? 'text-red-700' : lowStock ? 'text-[#8a6d3b]' : 'text-emerald-700'}`} aria-live="polite">
              {priced.stock <= 0 ? 'Out of stock in this option' : lowStock ? `Low stock — only ${priced.stock} left in this option` : 'In stock and ready to ship'}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <QuantitySelector value={qty} onChange={setQty} max={Math.max(1, priced.stock)} size="lg" />
              <Button size="lg" className="flex-1" disabled={priced.stock <= 0} onClick={() => addToCart(product, selection, qty)}>
                Add to Cart
              </Button>
            </div>
            <div className="mt-3 flex gap-3">
              <Button size="lg" variant="pink" className="flex-1" disabled={priced.stock <= 0} onClick={buyNow}>
                <ZapIcon className="h-4 w-4" aria-hidden /> Buy Now
              </Button>
              <WishlistButton productId={product.id} productName={product.name} withLabel />
              <button onClick={share} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line transition-colors duration-150 hover:border-ink" aria-label="Share product">
                <Share2Icon className="h-4 w-4" />
              </button>
            </div>

            <ul className="mt-8 space-y-3 border-t border-line pt-6 text-sm text-charcoal">
              <li className="flex gap-3"><TruckIcon className="h-5 w-5 shrink-0 text-gold" aria-hidden />Nationwide delivery — fee calculated at checkout by state.</li>
              <li className="flex gap-3"><ShieldCheckIcon className="h-5 w-5 shrink-0 text-gold" aria-hidden />Guest checkout available. Pay by bank transfer or on delivery.</li>
            </ul>
          </div>
        </div>

        <div className="mt-20">
          <ProductTabs product={product} />
        </div>
      </div>

      <ProductRail title="You may also like" products={relatedProducts(product, 8)} action={{ label: 'Shop all', to: `${storeHome}/shop/all` }} />
    </div>);

}