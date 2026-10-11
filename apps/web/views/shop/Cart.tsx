'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookmarkIcon, ShoppingBagIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuantitySelector } from '@/components/product/QuantitySelector';
import { OrderTotals } from '@/components/checkout/OrderTotals';
import { useCart } from '@/contexts/CartContext';
import { formatNaira } from '@/lib/utils/currency';
import { divisionLabel } from '@/lib/utils/products';
import type { CartItem } from '@/types/order';
import { SiteImage } from '@/components/ui/SiteImage';

export function Cart() {
  const {
    activeItems,
    savedItems,
    subtotal,
    discount,
    promoCode,
    updateQuantity,
    removeItem,
    toggleSaveForLater,
    applyPromo,
    removePromo,
  } = useCart();
  const [code, setCode] = useState('');
  const [promoError, setPromoError] = useState('');

  const submitPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (applyPromo(code)) {
      setPromoError('');
      setCode('');
      toast.success('Promo code applied');
    } else setPromoError('That code is not valid. Try the sample code LUXE10.');
  };

  return (
    <div className="mx-auto max-w-site px-5 pb-24 pt-10 lg:px-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shopping Cart' }]} />
      <h1 className="mt-6 font-display text-5xl text-ink md:text-6xl">Shopping Cart</h1>

      {activeItems.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<ShoppingBagIcon className="h-7 w-7" />}
          title="Your cart is empty"
          text="Add wigs from LUXICHIC Hairs and tools from Hair Tools & Essentials — you can check out both in one order."
          actions={
            <>
              <Button to="/hairs">Shop LUXICHIC Hairs</Button>
              <Button to="/tools" variant="outline">
                Shop Hair Tools
              </Button>
            </>
          }
        />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          <section aria-label="Cart items">
            <div className="hidden grid-cols-[1fr_140px_120px] border-b border-line pb-3 text-xs font-semibold text-subtle md:grid">
              <span>Product</span>
              <span>Quantity</span>
              <span className="text-right">Subtotal</span>
            </div>
            <ul className="divide-y divide-line">
              {activeItems.map((item) => (
                <CartRow
                  key={item.key}
                  item={item}
                  onQty={(q) => updateQuantity(item.key, q)}
                  onRemove={() => removeItem(item.key)}
                  onSave={() => {
                    toggleSaveForLater(item.key);
                    toast('Saved for later', { description: item.name });
                  }}
                />
              ))}
            </ul>
          </section>

          <aside className="h-fit rounded-[28px] bg-white p-6 lg:sticky lg:top-28">
            <h2 className="font-display text-3xl text-ink">Order summary</h2>
            <form onSubmit={submitPromo} className="mt-6">
              <label htmlFor="promo" className="text-xs font-semibold text-charcoal">
                Promo code
              </label>
              {promoCode ? (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-blush/60 px-4 py-3 text-sm">
                  <span>
                    <span className="font-semibold">{promoCode}</span> applied
                  </span>
                  <button type="button" onClick={removePromo} className="text-xs font-semibold text-pink-deep">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    id="promo"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter code"
                    aria-invalid={!!promoError}
                    aria-describedby={promoError ? 'promo-error' : undefined}
                    className="h-11 flex-1 rounded-full border border-line px-4 text-sm uppercase focus:border-ink focus:outline-none"
                  />

                  <Button type="submit" variant="outline" size="sm" className="h-11">
                    Apply
                  </Button>
                </div>
              )}
              {promoError && (
                <p id="promo-error" className="mt-2 text-xs text-red-700" role="alert">
                  {promoError}
                </p>
              )}
            </form>
            <div className="mt-6">
              <OrderTotals subtotal={subtotal} deliveryFee={null} discount={discount} promoCode={promoCode} />
            </div>
            <Button to="/checkout" size="lg" fullWidth className="mt-6">
              Proceed to Checkout
            </Button>
            <p className="mt-3 text-center text-xs text-subtle">Guest checkout available — no account needed.</p>
          </aside>
        </div>
      )}

      {savedItems.length > 0 && (
        <section className="mt-16" aria-labelledby="saved-heading">
          <h2 id="saved-heading" className="font-display text-3xl text-ink">
            Saved for later ({savedItems.length})
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedItems.map((item) => (
              <li key={item.key} className="flex gap-4 rounded-2xl bg-white p-4">
                <SiteImage sizes="80px" src={item.image} alt="" className="h-24 w-20 rounded-xl object-cover" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                  <p className="text-xs text-subtle">{Object.values(item.variants).join(' · ')}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">{formatNaira(item.unitPrice)}</p>
                  <div className="mt-auto flex gap-4 pt-2 text-xs font-semibold">
                    <button onClick={() => toggleSaveForLater(item.key)} className="text-ink hover:text-pink-deep">
                      Move to cart
                    </button>
                    <button onClick={() => removeItem(item.key)} className="text-subtle hover:text-red-700">
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CartRow({
  item,
  onQty,
  onRemove,
  onSave,
}: {
  item: CartItem;
  onQty: (q: number) => void;
  onRemove: () => void;
  onSave: () => void;
}) {
  return (
    <li className="grid grid-cols-[88px_1fr] gap-4 py-6 md:grid-cols-[1fr_140px_120px] md:items-center">
      <div className="contents md:flex md:gap-5">
        <Link
          href={`/${item.division}/product/${item.slug}`}
          className="row-span-2 block h-28 w-[88px] shrink-0 overflow-hidden rounded-xl bg-ivory md:row-span-1"
        >
          <SiteImage sizes="96px" src={item.image} alt={item.name} className="h-full w-full object-cover" />
        </Link>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
            {divisionLabel(item.division)}
          </p>
          <Link
            href={`/${item.division}/product/${item.slug}`}
            className="mt-0.5 block text-[15px] font-medium text-ink hover:text-pink-deep"
          >
            {item.name}
          </Link>
          {Object.keys(item.variants).length > 0 && (
            <p className="mt-1 text-xs text-subtle">
              {Object.entries(item.variants)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')}
            </p>
          )}
          <p className="mt-1 text-xs text-subtle">Unit price: {formatNaira(item.unitPrice)}</p>
          <div className="mt-3 flex gap-4 text-xs font-semibold">
            <button onClick={onSave} className="inline-flex items-center gap-1.5 text-ink hover:text-pink-deep">
              <BookmarkIcon className="h-3.5 w-3.5" aria-hidden /> Save for later
            </button>
            <button onClick={onRemove} className="inline-flex items-center gap-1.5 text-subtle hover:text-red-700">
              <Trash2Icon className="h-3.5 w-3.5" aria-hidden /> Remove
            </button>
          </div>
        </div>
      </div>
      <div className="col-start-2 flex items-center justify-between md:col-start-auto md:block">
        <QuantitySelector value={item.quantity} onChange={onQty} label={`Quantity for ${item.name}`} />
        <p className="text-sm font-semibold tabular-nums md:hidden">{formatNaira(item.unitPrice * item.quantity)}</p>
      </div>
      <p className="hidden text-right text-[15px] font-semibold tabular-nums md:block">
        {formatNaira(item.unitPrice * item.quantity)}
      </p>
    </li>
  );
}
