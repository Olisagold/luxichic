import type { Address } from '@/types/order';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  /** PROTOTYPE ONLY — passwords are never stored client-side in production. */
  password: string;
  addresses: Address[];
  createdAt: string;
  status?: 'active' | 'blocked';
  lastActiveAt?: string;
  /** Created by an administrator; the customer sets their password via a setup link. */
  pendingSetup?: boolean;
}

export interface Review {
  id: string;
  productId: string;
  authorName: string;
  authorEmail?: string;
  rating: number;
  title: string;
  body: string;
  images?: string[];
  verified: boolean;
  date: string;
  status?: 'visible' | 'hidden' | 'archived';
}

export interface Result {
  ok: boolean;
  error?: string;
}