import type { AvailabilityBlock } from '@/types/admin';

export interface PromoCode {
  code: string;
  percent: number;
  /** Fixed ₦ amount off. When set, takes precedence over `percent`. */
  amount?: number;
  minSpend?: number;
  label: string;
}

/**
 * Business configuration. Every value here is a placeholder until LUXICHIC
 * supplies the real details. At runtime the admin store (services/db.ts)
 * overwrites these values with whatever the administrator has saved.
 */
export const businessConfig = {
  name: 'LUXICHIC',
  pricesAreSamples: true,

  /** Default for Pay on Delivery. Managed from Admin → Payments. */
  payOnDeliveryEnabled: true,

  bank: {
    bankName: '[Bank Name, to be provided]',
    accountName: '[Account Name, to be provided]',
    accountNumber: '0000000000',
    instructions: '',
  },

  whatsapp: {
    general: '2340000000000',
    orders: '2340000000001',
  },

  instagram: {
    hairs: { handle: '@luxichic.hairs', url: 'https://instagram.com/' },
    salon: { handle: '@luxichic.salonandspa', url: 'https://instagram.com/' },
    tools: { handle: '@luxichic.wigtools', url: 'https://instagram.com/' },
  },

  tiktok: { handle: '@luxichic', url: 'https://www.tiktok.com/@luxichic' },

  contact: {
    email: 'hello@luxichic.example',
    phone: '+234 000 000 0000',
    address: '[Store address, to be provided], Nigeria',
    hours: 'Mon – Sun, 9:00am – 7:00pm',
  },

  delivery: {
    /** Delivery fee by state (₦). Unlisted states use `default`. Sample values. */
    fees: { Lagos: 3500, Ogun: 5000, Oyo: 5500, Abuja: 6000, Rivers: 6500 } as Record<string, number>,
    /** States LUXICHIC does not currently deliver to. */
    disabled: [] as string[],
    default: 7500,
    estimate: 'Estimated delivery: 1–3 working days in Lagos, 3–7 working days elsewhere (to be confirmed).',
  },

  promoCodes: [{ code: 'LUXE10', percent: 10, label: '10% off your order' }] as PromoCode[],

  /** Hours before a post-order account-creation link expires. */
  accountLinkExpiryHours: 72,

  salon: {
    /** 0 = Sunday. Days the salon is closed (open every day). */
    closedWeekdays: [] as number[],
    slots: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
    bookingWindowDays: 60,
    /** Admin-defined unavailable dates/times. */
    blocks: [] as AvailabilityBlock[],
  },
};

export function deliveryFeeFor(state: string): number {
  if (!state) return 0;
  return businessConfig.delivery.fees[state] ?? businessConfig.delivery.default;
}

export function isDeliveryAvailable(state: string): boolean {
  return !businessConfig.delivery.disabled.includes(state);
}
