import type { Product } from '@/types/product';
import type { CartItem } from '@/types/order';
import { priceForSelection } from '@/lib/utils/products';

/** Pure cart helpers, shared by the browser (adding to the cart) and the server (pricing it). */

/** What identifies a cart line: the product, its option selection (option key → value label) and quantity. */
export interface CartLine {
  productId: string;
  selection: Record<string, string>;
  quantity: number;
  savedForLater?: boolean;
}

export const MAX_QUANTITY = 99;

export const clampQuantity = (q: number) => Math.max(1, Math.min(MAX_QUANTITY, Math.round(q) || 1));

export function toCartItem(product: Product, selection: Record<string, string>, quantity: number): CartItem {
  const keyParts = product.variants.map((g) => `${g.key}:${selection[g.key] ?? ''}`);
  const variants: Record<string, string> = {};
  product.variants.forEach((g) => {
    if (selection[g.key]) variants[g.name] = selection[g.key];
  });
  return {
    key: [product.id, ...keyParts].join('|'),
    productId: product.id,
    slug: product.slug,
    division: product.division,
    name: product.name,
    image: product.images[0],
    unitPrice: priceForSelection(product, selection).price,
    quantity,
    variants,
  };
}

/** The option selection encoded in a cart item key (`productId|length:18"|lace:HD`). */
export function selectionFromKey(key: string): Record<string, string> {
  const selection: Record<string, string> = {};
  key
    .split('|')
    .slice(1)
    .forEach((part) => {
      const i = part.indexOf(':');
      if (i > 0) selection[part.slice(0, i)] = part.slice(i + 1);
    });
  return selection;
}

export function toCartLine(item: CartItem): CartLine {
  return {
    productId: item.productId,
    selection: selectionFromKey(item.key),
    quantity: item.quantity,
    savedForLater: !!item.savedForLater,
  };
}

/**
 * The cart item for `line` at today's price, or null when it can't be bought as chosen: the product is gone or
 * unpublished, or an option value no longer exists. Every option must have a value.
 */
export function priceLine(product: Product | undefined, line: CartLine): CartItem | null {
  if (!product) return null;
  const valid = product.variants.every((g) => g.values.some((v) => v.label === line.selection[g.key]));
  if (!valid) return null;
  const selection = Object.fromEntries(product.variants.map((g) => [g.key, line.selection[g.key]]));
  return {
    ...toCartItem(product, selection, clampQuantity(line.quantity)),
    ...(line.savedForLater ? { savedForLater: true } : {}),
  };
}
