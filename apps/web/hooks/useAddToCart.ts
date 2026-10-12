import { toast } from 'sonner';
import type { Product } from '@/types/product';
import { useCart } from '@/contexts/CartContext';
import { useUI } from '@/contexts/UIContext';
import { toCartItem } from '@/lib/cart/items';
import { defaultSelection, priceForSelection } from '@/lib/utils/products';

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
