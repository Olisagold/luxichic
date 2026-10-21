/**
 * The prototype's catalog, content and demo records, built from apps/web/data. Only the seed scripts and the
 * storefront's no-database fallback (a CI build) use it; nothing in the browser does.
 */
import type { Product } from '@/types/product';
import type { AdminProduct, AdminService, StoreDb, StoreSettings, SiteContent } from '@/types/admin';
import { hairProducts } from '@/data/hairProducts';
import { toolProducts } from '@/data/toolProducts';
import { hairCategories, toolCategories } from '@/data/categories';
import { salonServices } from '@/data/services';
import { businessConfig } from '@/data/config';
import { nigerianStates } from '@/data/states';
import { defaultSocialLinks } from '@/data/socialLinks';
import { announcements, brandValues, faqs, policies, siteContent, testimonials, whyChoose } from '@/data/content';
import { images } from '@/data/images';
import {
  seedActivity,
  seedAdmins,
  seedDiscounts,
  seedEmailTemplates,
  seedLoginHistory,
  seedMedia,
  seedNotifications,
  seedSpecialists,
} from '@/data/adminSeed';

export const VERSION = 1;

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/* Snapshots of the original static data, taken before any runtime sync mutates them. */
const originals = {
  products: clone([...hairProducts, ...toolProducts]),
  hairCategories: clone(hairCategories),
  toolCategories: clone(toolCategories),
  services: clone(salonServices),
  config: clone(businessConfig),
};

function toAdminProduct(p: Product): AdminProduct {
  const isWig = p.division === 'hairs';
  return {
    ...p,
    sku: `LX-${p.division === 'hairs' ? 'H' : 'T'}-${p.id.slice(1).padStart(3, '0')}`,
    status: 'published',
    lowStockThreshold: isWig ? 3 : 10,
    trackInventory: true,
    outOfStockBehaviour: 'show-sold-out',
    isFeatured: p.featuredRank <= 4,
    isSale: !!p.originalPrice && p.originalPrice > p.price,
    discountMode: p.originalPrice && p.originalPrice > p.price ? 'fixed' : 'none',
    shipping: {
      estimate: '1–3 working days in Lagos · 3–7 elsewhere',
      method: 'Door delivery',
      pickup: true,
      notes: '',
      handling: isWig ? 'Packed in a protective box with a hair net.' : '',
    },
    variantMeta: {},
    updatedAt: p.createdAt,
  };
}

function servicesFromSeed(): AdminService[] {
  return originals.services.map((s) => ({
    ...s,
    status: 'published',
    durationMinutes: /120/.test(s.duration ?? '')
      ? 120
      : /90/.test(s.duration ?? '')
        ? 90
        : /75/.test(s.duration ?? '')
          ? 75
          : /45/.test(s.duration ?? '')
            ? 45
            : 60,
    bookable: true,
  }));
}

function defaultSettings(): StoreSettings {
  const c = originals.config;
  return {
    business: {
      name: 'LUXICHIC',
      email: c.contact.email,
      phone: c.contact.phone,
      whatsapp: c.whatsapp.general,
      address: c.contact.address,
      hours: c.contact.hours,
    },
    instagram: { hairs: c.instagram.hairs.url, salon: c.instagram.salon.url, tools: c.instagram.tools.url },
    instagramHandles: {
      hairs: c.instagram.hairs.handle,
      salon: c.instagram.salon.handle,
      tools: c.instagram.tools.handle,
    },
    tiktok: { ...c.tiktok },
    socialLinks: clone(defaultSocialLinks),
    payOnDeliveryEnabled: c.payOnDeliveryEnabled,
    bank: { ...c.bank, instructions: 'Use your 8-digit LUXICHIC transaction reference as the narration.' },
    delivery: {
      rates: nigerianStates.map((state) => ({
        state,
        fee: c.delivery.fees[state] ?? c.delivery.default,
        free: false,
        enabled: true,
      })),
      estimate: c.delivery.estimate,
    },
    whatsapp: {
      status: 'disconnected',
      businessNumber: c.whatsapp.general,
      adminNumber: c.whatsapp.orders,
      apiKeySet: false,
      apiKeyLast4: '',
      webhookUrl: 'https://api.luxichic.example/webhooks/whatsapp',
      notifyOrders: true,
      notifyAppointments: true,
      orderTemplate:
        'NEW LUXICHIC ORDER\n\nOrder: {{order_number}}\nTransaction Reference: {{transaction_reference}}\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\n\nProducts:\n{{products}}\n\nTotal: {{total_amount}}\nPayment Method: {{payment_method}}\nDelivery State: {{delivery_state}}',
      appointmentTemplate:
        'NEW LUXICHIC APPOINTMENT\n\nAppointment Reference: {{appointment_reference}}\nCustomer: {{customer_name}}\nService: {{service_name}}\nDate: {{appointment_date}}\nTime: {{appointment_time}}\nPhone: {{customer_phone}}\nSpecialist: {{specialist_name}}\nStatus: {{status}}',
    },
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      username: 'notifications@luxichic.example',
      passwordSet: false,
      encryption: 'TLS',
      senderName: 'LUXICHIC',
      senderEmail: 'hello@luxichic.example',
    },
    notifications: { email: true, lowStock: true, newOrder: true, newAppointment: true, newReview: true },
    security: { sessionTimeoutMinutes: 60, loginAlerts: true },
  };
}

function defaultContent(): SiteContent {
  return {
    announcements: announcements.map((text, i) => ({ id: `ann${i}`, text, enabled: true })),
    sections: [
      { id: 'announcement', label: 'Announcement bar', enabled: true },
      { id: 'hero', label: 'Hero', enabled: true },
      { id: 'intro', label: 'Introduction', enabled: true },
      { id: 'divisions', label: 'Three divisions', enabled: true },
      { id: 'collections', label: 'Featured hair collections', enabled: true },
      { id: 'hairs', label: 'Bestselling hair', enabled: true },
      { id: 'tools', label: 'Hair tools & essentials', enabled: true },
      { id: 'salon', label: 'Salon services', enabled: true },
      { id: 'why', label: 'Why LUXICHIC', enabled: true },
      { id: 'testimonials', label: 'Testimonials', enabled: true },
      { id: 'instagram', label: 'Instagram galleries', enabled: true },
      { id: 'newsletter', label: 'Newsletter', enabled: true },
    ],

    hero: { ...siteContent.hero },
    intro: { ...siteContent.intro },
    divisions: [
      {
        id: 'hairs',
        title: 'LUXICHIC Hairs',
        text: 'Discover beautiful wigs, premium human hair, elegant frontals, closures and everything you need to achieve your desired look.',
        cta: 'Explore LUXICHIC Hairs',
        image: images.bodyWaveWig,
      },
      {
        id: 'salon',
        title: 'Beauty Salon & Spa',
        text: 'Experience professional beauty treatments, personalized care and luxurious salon services designed to help you look and feel your best.',
        cta: 'Explore Our Services',
        image: images.nails,
      },
      {
        id: 'tools',
        title: 'Hair Tools & Essentials',
        text: 'Shop quality haircare products, professional salon equipment, wig-making tools and affordable braiding extensions.',
        cta: 'Shop Hair Essentials',
        image: images.hotComb,
      },
    ],

    featuredCollectionSlugs: [
      'bone-straight',
      'silky-straight',
      'kinky-straight',
      'yaki-straight',
      'deep-wave',
      'body-wave',
      'brazilian',
      'virgin',
    ],
    featuredProductIds: ['h1', 'h2', 'h3', 'h4', 'h5'],
    featuredServiceSlugs: [
      'manicure',
      'pedicure',
      'facials',
      'eyelash-extensions',
      'nail-services',
      'braiding',
      'hair-treatment',
      'barbing',
    ],
    salonSection: { heading: 'Beauty Salon & Spa', text: 'Book online, pay after your service.' },
    why: { heading: 'Why LUXICHIC?', items: whyChoose.map((w) => ({ ...w })) },
    testimonials: testimonials.map((t, i) => ({ ...t, id: `t${i}`, status: 'active' as const })),
    about: {
      title: siteContent.about.title,
      accent: siteContent.about.accent,
      intro: siteContent.about.intro,
      description: siteContent.about.description,
      mission: '[Editable] Our mission statement.',
      vision: '[Editable] Our vision statement.',
      values: brandValues.map((v) => ({ ...v })),
      image: siteContent.about.image,
      cta: siteContent.about.cta,
    },
    contact: { heading: 'We’d love to hear from you', text: '' },
    faqs: clone(faqs),
    policies: clone(policies),
  };
}

export function buildInitialDb(): StoreDb {
  return {
    version: VERSION,
    products: originals.products.map(toAdminProduct),
    categories: { hairs: clone(originals.hairCategories), tools: clone(originals.toolCategories) },
    services: servicesFromSeed(),
    specialists: clone(seedSpecialists),
    blocks: [
      {
        id: 'blk1',
        date: nextWeekday(5),
        start: '14:00',
        end: '15:00',
        serviceSlug: 'manicure',
        specialistId: null,
        reason: 'Booked offline',
        createdBy: 'LUXICHIC Admin',
        createdAt: new Date().toISOString(),
      },
    ],

    settings: defaultSettings(),
    content: defaultContent(),
    emailTemplates: clone(seedEmailTemplates),
    discounts: clone(seedDiscounts),
    stockMoves: [],
    activity: clone(seedActivity),
    notifications: clone(seedNotifications),
    admins: clone(seedAdmins),
    loginHistory: clone(seedLoginHistory),
    media: clone(seedMedia),
    orderNotes: {},
    customerNotes: {},
  };
}

function nextWeekday(daysAhead: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
