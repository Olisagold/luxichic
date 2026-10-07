import type { Category, Product } from './product';
import type { SalonService } from './salon';

/* ------------------------------------------------------------------ */
/* Social links                                                        */
/* ------------------------------------------------------------------ */

export type SocialPlatform = 'instagram' | 'tiktok' | 'whatsapp' | 'facebook' | 'x' | 'youtube' | 'snapchat' | 'website';
export type SocialDivision = 'main' | 'hairs' | 'salon' | 'tools';

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  division: SocialDivision;
  /** Display handle, e.g. @luxichic.hairs (or a label for websites). */
  handle: string;
  /** Full profile URL — for WhatsApp, the number in international format. */
  url: string;
  enabled: boolean;
}

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

export type Permission =
'dashboard.view' |
'analytics.view' |
'orders.view' | 'orders.confirmPayment' | 'orders.edit' | 'orders.delete' |
'products.view' | 'products.create' | 'products.edit' | 'products.delete' | 'products.archive' |
'inventory.manage' |
'categories.manage' |
'discounts.manage' |
'customers.view' | 'customers.edit' | 'customers.delete' | 'customers.block' |
'reviews.view' | 'reviews.moderate' |
'appointments.view' | 'appointments.confirm' | 'appointments.reschedule' | 'appointments.reject' |
'salon.services' | 'salon.specialists' | 'salon.availability' |
'content.homepage' | 'content.pages' | 'content.media' |
'settings.payment' | 'settings.delivery' | 'settings.whatsapp' | 'settings.email' | 'settings.general' |
'admins.manage' |
'logs.view';

export interface PermissionGroup {
  label: string;
  items: {key: Permission;label: string;}[];
}

export type AdminRole = 'Super Admin' | 'Order Manager' | 'Product Manager' | 'Salon Manager' | 'Content Manager' | 'Customer Support' | 'Custom';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  username?: string;
  /** PROTOTYPE ONLY — never rendered. In production the backend stores a salted hash. */
  password: string;
  role: AdminRole;
  isOwner: boolean;
  status: 'active' | 'suspended';
  permissions: Permission[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface LoginEntry {
  id: string;
  adminId: string;
  adminName: string;
  email: string;
  at: string;
  browser: string;
  device: string;
  location: string;
  current?: boolean;
}

/* ------------------------------------------------------------------ */
/* Catalog extensions                                                  */
/* ------------------------------------------------------------------ */

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface AdminProduct extends Product {
  sku: string;
  status: ProductStatus;
  lowStockThreshold: number;
  trackInventory: boolean;
  outOfStockBehaviour: 'hide' | 'show-sold-out';
  isFeatured: boolean;
  isSale: boolean;
  discountMode: 'none' | 'fixed' | 'percent';
  discountPercent?: number;
  discountStart?: string;
  discountEnd?: string;
  benefits?: string;
  care?: string;
  shipping: {estimate: string;method: string;pickup: boolean;notes: string;handling: string;};
  /** Per-option-value metadata keyed `${groupKey}::${label}`. */
  variantMeta: Record<string, {sku?: string;enabled: boolean;}>;
  updatedAt: string;
}

export interface StockMove {
  id: string;
  productId: string;
  productName: string;
  variant?: string;
  change: number;
  resultingStock: number;
  reason: string;
  by: string;
  at: string;
}

export interface Discount {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSpend: number;
  startsAt: string;
  endsAt: string;
  usageLimit: number | null;
  used: number;
  active: boolean;
  scope: 'all' | 'hairs' | 'tools';
}

/* ------------------------------------------------------------------ */
/* Salon                                                               */
/* ------------------------------------------------------------------ */

export interface Specialist {
  id: string;
  name: string;
  title: string;
  image: string;
  bio: string;
  specialties: string[];
  serviceSlugs: string[];
  /** Working days 0–6 (0 = Sunday). */
  workingDays: number[];
  hours: {start: string;end: string;};
  status: 'active' | 'on-leave' | 'archived';
}

export interface AdminService extends SalonService {
  status: 'published' | 'draft' | 'archived';
  durationMinutes: number;
  bookable: boolean;
}

export interface AvailabilityBlock {
  id: string;
  date: string;
  /** null = entire day */
  start: string | null;
  end: string | null;
  serviceSlug: string | null;
  specialistId: string | null;
  reason: string;
  createdBy: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Settings & content                                                  */
/* ------------------------------------------------------------------ */

export interface DeliveryRate {
  state: string;
  fee: number;
  free: boolean;
  enabled: boolean;
}

export interface StoreSettings {
  business: {name: string;email: string;phone: string;whatsapp: string;address: string;hours: string;};
  instagram: {hairs: string;salon: string;tools: string;};
  instagramHandles: {hairs: string;salon: string;tools: string;};
  /** Optional for stores saved before TikTok was added. */
  tiktok?: {handle: string;url: string;};
  /** Footer social icons, managed from Admin → Settings → Social media. */
  socialLinks?: SocialLink[];
  payOnDeliveryEnabled: boolean;
  bank: {bankName: string;accountName: string;accountNumber: string;instructions: string;};
  delivery: {rates: DeliveryRate[];estimate: string;};
  whatsapp: {
    status: 'connected' | 'disconnected' | 'error';
    businessNumber: string;
    adminNumber: string;
    apiKeySet: boolean;
    apiKeyLast4: string;
    webhookUrl: string;
    notifyOrders: boolean;
    notifyAppointments: boolean;
    orderTemplate: string;
    appointmentTemplate: string;
  };
  smtp: {host: string;port: number;username: string;passwordSet: boolean;encryption: 'TLS' | 'SSL' | 'None';senderName: string;senderEmail: string;};
  notifications: {email: boolean;lowStock: boolean;newOrder: boolean;newAppointment: boolean;newReview: boolean;};
  security: {sessionTimeoutMinutes: number;loginAlerts: boolean;};
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  enabled: boolean;
}

export interface HomeSection {
  id: 'announcement' | 'hero' | 'intro' | 'divisions' | 'collections' | 'hairs' | 'tools' | 'salon' | 'why' | 'testimonials' | 'instagram' | 'newsletter';
  label: string;
  enabled: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  initials: string;
  rating: number;
  item: string;
  text: string;
  status: 'active' | 'archived';
}

export interface SiteContent {
  announcements: {id: string;text: string;enabled: boolean;}[];
  sections: HomeSection[];
  hero: {eyebrow: string;line1: string;line2: string;accent: string;text: string;primaryCta: string;secondaryCta: string;image: string;};
  intro: {heading: string;accent: string;text: string;};
  divisions: {id: 'hairs' | 'salon' | 'tools';title: string;text: string;cta: string;image: string;}[];
  featuredCollectionSlugs: string[];
  featuredProductIds: string[];
  featuredServiceSlugs: string[];
  salonSection: {heading: string;text: string;};
  why: {heading: string;items: {title: string;text: string;}[];};
  testimonials: Testimonial[];
  about: {title: string;intro: string;description: string;mission: string;vision: string;values: {title: string;text: string;}[];image: string;cta: string;};
  contact: {heading: string;text: string;};
  faqs: {category: string;items: {q: string;a: string;}[];}[];
  policies: Record<string, {title: string;sections: {heading: string;body: string;}[];}>;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  folder: 'Homepage' | 'Hairs' | 'Hair Tools' | 'Salon' | 'Products' | 'Services';
  width: number;
  height: number;
  sizeKb: number;
  uploadedAt: string;
}

/* ------------------------------------------------------------------ */
/* Activity & notifications                                            */
/* ------------------------------------------------------------------ */

export type ActivitySection =
'Orders' | 'Products' | 'Inventory' | 'Customers' | 'Reviews' | 'Appointments' | 'Salon' | 'Content' |
'Payments' | 'Delivery' | 'WhatsApp' | 'Email' | 'Admin Users' | 'Settings' | 'Security' | 'Discounts' | 'Categories';

export interface ActivityEntry {
  id: string;
  at: string;
  adminId: string;
  adminName: string;
  section: ActivitySection;
  action: string;
  target?: string;
  link?: string;
}

export type NotificationKind = 'order' | 'payment' | 'appointment' | 'stock' | 'customer' | 'review' | 'integration';

export interface AdminNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link?: string;
}

/* ------------------------------------------------------------------ */
/* Whole store                                                          */
/* ------------------------------------------------------------------ */

export interface StoreDb {
  version: number;
  products: AdminProduct[];
  categories: {hairs: Category[];tools: Category[];};
  services: AdminService[];
  specialists: Specialist[];
  blocks: AvailabilityBlock[];
  settings: StoreSettings;
  content: SiteContent;
  emailTemplates: EmailTemplate[];
  discounts: Discount[];
  stockMoves: StockMove[];
  activity: ActivityEntry[];
  notifications: AdminNotification[];
  admins: AdminUser[];
  loginHistory: LoginEntry[];
  media: MediaItem[];
  orderNotes: Record<string, {id: string;text: string;by: string;at: string;}[]>;
  customerNotes: Record<string, {id: string;text: string;by: string;at: string;}[]>;
}