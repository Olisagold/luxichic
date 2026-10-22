'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBagIcon, Trash2Icon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { QuantitySelector } from '@/components/product/QuantitySelector';
import { useCart } from '@/contexts/CartContext';
import { useUI } from '@/contexts/UIContext';
import { formatNaira } from '@/lib/utils/currency';
import { divisionLabel } from '@/lib/utils/products';
import { cn } from '@/lib/utils/cn';
import { SiteImage } from '@/components/ui/SiteImage';

export function CartDrawer() {
  const { cartOpen, closeCart } = useUI();
  const { activeItems, subtotal, count, updateQuantity, removeItem, lastAddedKey } = useCart();

  return (
    <Modal open={cartOpen} onClose={closeCart} title={`Your Cart (${count})`} side="right">
      {activeItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blush text-pink-deep">
            <ShoppingBagIcon className="h-7 w-7" aria-hidden />
          </span>
          <p className="mt-5 font-display text-3xl">Your cart is empty</p>
          <p className="mt-2 text-sm text-subtle">Discover premium hair and professional tools, all in one cart.</p>
          <div className="mt-6 flex w-full flex-col gap-3">
            <Button to="/hairs" onClick={closeCart} fullWidth>
              Shop LUXICHIC Hairs
            </Button>
            <Button to="/tools" onClick={closeCart} variant="outline" fullWidth>
              Shop Hair Tools
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
            <AnimatePresence initial={false}>
              {activeItems.map((item) => (
                <motion.li
                  key={item.key}
                  layout
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="flex gap-4 py-5"
                >
                  <Link
                    href={`/${item.division}/product/${item.slug}`}
                    onClick={closeCart}
                    className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-ivory"
                  >
                    <SiteImage sizes="96px" src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-[0.14em]',
                            item.key === lastAddedKey ? 'text-pink-deep' : 'text-subtle',
                          )}
                        >
                          {item.key === lastAddedKey ? 'Just added' : divisionLabel(item.division)}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-medium text-ink">{item.name}</p>
                        {Object.keys(item.variants).length > 0 && (
                          <p className="mt-0.5 text-xs text-subtle">{Object.values(item.variants).join(' · ')}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.key)}
                        className="rounded-full p-1.5 text-subtle hover:text-red-700"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QuantitySelector value={item.quantity} onChange={(q) => updateQuantity(item.key, q)} />
                      <span className="text-sm font-semibold tabular-nums">
                        {formatNaira(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="border-t border-line bg-ivory px-6 py-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-subtle">Subtotal</span>
              <span className="text-lg font-semibold tabular-nums">{formatNaira(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-subtle">Delivery and discounts are calculated at checkout.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button to="/cart" onClick={closeCart} variant="outline">
                View Cart
              </Button>
              <Button to="/checkout" onClick={closeCart}>
                Checkout
              </Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
