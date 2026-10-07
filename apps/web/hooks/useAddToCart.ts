import { toast } from 'sonner';
import type { Product } from '@/types/product';
import type { CartItem } from '@/types/order';
import { useCart } from '@/contexts/CartContext';
import { useUI } from '@/contexts/UIContext';
import { defaultSelection, priceForSelection } from '@/lib/utils/products';

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

export function useAddToCart() {
  const { addItem } = useCart();
  const { openCart } = useUI();

  return (product: Product, selection?: Record<string, string>, quantity = 1) => {
    const sel = selection ?? defaultSelection(product);
    if (priceForSelection(product, sel).stock <= 0) {
      toast.error('This option is currently out of stock.');
      return;
    }
    const item = toCartItem(product, sel, quantity);
    addItem(item);
    const variantText = Object.values(item.variants).join(' · ');
    toast.success(`${product.name} added to your cart`, {
      description: variantText || undefined,
      action: { label: 'View cart', onClick: openCart },
    });
  };
}
