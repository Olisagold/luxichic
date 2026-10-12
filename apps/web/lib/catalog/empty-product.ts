import type { AdminProduct } from '@/types/admin';
import type { Division } from '@/types/product';

/** A blank product for the editor's "New product". */
export function emptyProduct(division: Division): AdminProduct {
  const now = new Date().toISOString();
  return {
    // Empty until the first save, when the server gives it an id.
    id: '',
    slug: '',
    division,
    name: '',
    shortDescription: '',
    description: '',
    price: 0,
    images: [],
    rating: 0,
    reviewCount: 0,
    stock: 0,
    categories: [],
    attributes: {},
    variants: [],
    specs: [],
    featuredRank: 50,
    salesCount: 0,
    createdAt: now,
    sku: '',
    status: 'draft',
    lowStockThreshold: 5,
    trackInventory: true,
    outOfStockBehaviour: 'show-sold-out',
    isFeatured: false,
    isSale: false,
    discountMode: 'none',
    shipping: {
      estimate: '1–3 working days in Lagos · 3–7 elsewhere',
      method: 'Door delivery',
      pickup: true,
      notes: '',
      handling: '',
    },
    variantMeta: {},
    updatedAt: now,
  };
}
