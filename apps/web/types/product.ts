export type Division = 'hairs' | 'tools';

export interface VariantValue {
  label: string;
  /** Amount added to the base price when this option is selected. */
  priceDelta?: number;
  /** Stock for this option. Falls back to product stock when omitted. */
  stock?: number;
}

export interface VariantGroup {
  key: string;
  name: string;
  values: VariantValue[];
}

export interface Spec {
  label: string;
  value: string;
}

export interface ProductAttributes {
  construction?: string;
  texture?: string;
  origin?: string;
  laceType?: string;
  lengths?: number[];
  brand?: string;
  features?: string[];
}

export interface Product {
  id: string;
  slug: string;
  division: Division;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  categories: string[];
  attributes: ProductAttributes;
  variants: VariantGroup[];
  specs: Spec[];
  usage?: string;
  isBestseller?: boolean;
  isNew?: boolean;
  featuredRank: number;
  salesCount: number;
  createdAt: string;
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  group: string;
  image: string;
}

export interface ProductFilterState {
  construction: string[];
  texture: string[];
  origin: string[];
  laceType: string[];
  lengths: number[];
  category: string[];
  brand: string[];
  features: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number;
  inStockOnly: boolean;
  discountedOnly: boolean;
}

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'bestselling';
