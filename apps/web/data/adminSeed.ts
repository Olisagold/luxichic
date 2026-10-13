import type { Order, OrderItem, OrderStatus, PaymentMethod, TimelineEntry } from '@/types/order';
import type { Appointment, AppointmentStatus } from '@/types/salon';
import type { Review, User } from '@/types/user';
import type {
  ActivityEntry,
  AdminNotification,
  AdminUser,
  Discount,
  EmailTemplate,
  LoginEntry,
  MediaItem,
  Permission,
  Specialist,
} from '@/types/admin';
import { hairProducts } from '@/data/hairProducts';
import { toolProducts } from '@/data/toolProducts';
import { images } from '@/data/images';

/**
 * PROTOTYPE SEED DATA for the admin dashboard. Everything here is demonstration content.
 * No passwords here: sign-in is checked by Supabase Auth, and the seed script creates dev logins.
 */
export const DEMO_ADMIN_EMAIL = 'demoadmin@luxichic.com';
export const DEMO_SUBADMIN_EMAIL = 'orders@luxichic.com';

/* deterministic PRNG so seeds look the same on every load */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(20261003);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const digits = (n: number) => Array.from({ length: n }, (_, i) => (i === 0 ? int(1, 9) : int(0, 9))).join('');

const TODAY = new Date('2026-10-03T12:00:00.000Z');
const daysAgo = (d: number, hour = 10) => {
  const x = new Date(TODAY);
  x.setUTCDate(x.getUTCDate() - d);
  x.setUTCHours(hour, int(0, 59), 0, 0);
  return x.toISOString();
};
const dateOffset = (d: number) => {
  const x = new Date(TODAY);
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

export const permissionGroups: { label: string; items: { key: Permission; label: string }[] }[] = [
  {
    label: 'Dashboard',
    items: [
      { key: 'dashboard.view', label: 'View dashboard' },
      { key: 'analytics.view', label: 'View analytics' },
    ],
  },
  {
    label: 'Orders',
    items: [
      { key: 'orders.view', label: 'View orders' },
      { key: 'orders.confirmPayment', label: 'Confirm payments' },
      { key: 'orders.edit', label: 'Edit orders' },
      { key: 'orders.delete', label: 'Delete orders' },
    ],
  },
  {
    label: 'Products',
    items: [
      { key: 'products.view', label: 'View products' },
      { key: 'products.create', label: 'Add products' },
      { key: 'products.edit', label: 'Edit products' },
      { key: 'products.archive', label: 'Archive products' },
      { key: 'products.delete', label: 'Delete products' },
      { key: 'inventory.manage', label: 'Manage inventory' },
      { key: 'categories.manage', label: 'Manage categories' },
      { key: 'discounts.manage', label: 'Manage discounts' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { key: 'customers.view', label: 'View customers' },
      { key: 'customers.edit', label: 'Edit customers' },
      { key: 'customers.block', label: 'Block customers' },
      { key: 'customers.delete', label: 'Delete customers' },
    ],
  },
  {
    label: 'Reviews',
    items: [
      { key: 'reviews.view', label: 'View reviews' },
      { key: 'reviews.moderate', label: 'Hide / delete reviews' },
    ],
  },
  {
    label: 'Appointments',
    items: [
      { key: 'appointments.view', label: 'View appointments' },
      { key: 'appointments.confirm', label: 'Confirm appointments' },
      { key: 'appointments.reschedule', label: 'Reschedule appointments' },
      { key: 'appointments.reject', label: 'Reject appointments' },
    ],
  },
  {
    label: 'Salon',
    items: [
      { key: 'salon.services', label: 'Manage services' },
      { key: 'salon.specialists', label: 'Manage specialists' },
      { key: 'salon.availability', label: 'Manage availability' },
    ],
  },
  {
    label: 'Website content',
    items: [
      { key: 'content.homepage', label: 'Edit homepage' },
      { key: 'content.pages', label: 'Edit About, FAQ & policies' },
      { key: 'content.media', label: 'Manage media library' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { key: 'settings.payment', label: 'Payment settings' },
      { key: 'settings.delivery', label: 'Delivery settings' },
      { key: 'settings.whatsapp', label: 'WhatsApp settings' },
      { key: 'settings.email', label: 'Email settings' },
      { key: 'settings.general', label: 'General & business settings' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { key: 'admins.manage', label: 'Manage admin users' },
      { key: 'logs.view', label: 'View activity logs' },
    ],
  },
];

export const allPermissions: Permission[] = permissionGroups.flatMap((g) => g.items.map((i) => i.key));

export const rolePresets: Record<Exclude<AdminUser['role'], 'Custom'>, Permission[]> = {
  'Super Admin': allPermissions,
  'Order Manager': [
    'dashboard.view',
    'orders.view',
    'orders.confirmPayment',
    'orders.edit',
    'customers.view',
    'customers.edit',
  ],
  'Product Manager': [
    'dashboard.view',
    'products.view',
    'products.create',
    'products.edit',
    'products.archive',
    'inventory.manage',
    'categories.manage',
    'discounts.manage',
    'content.media',
  ],
  'Salon Manager': [
    'dashboard.view',
    'appointments.view',
    'appointments.confirm',
    'appointments.reschedule',
    'appointments.reject',
    'salon.services',
    'salon.specialists',
    'salon.availability',
  ],
  'Content Manager': ['dashboard.view', 'content.homepage', 'content.pages', 'content.media'],
  'Customer Support': [
    'dashboard.view',
    'customers.view',
    'customers.edit',
    'reviews.view',
    'reviews.moderate',
    'appointments.view',
    'orders.view',
  ],
};

export const seedAdmins: AdminUser[] = [
  {
    id: 'adm_owner',
    fullName: 'LUXICHIC Admin',
    email: DEMO_ADMIN_EMAIL,
    username: 'demoadmin',
    role: 'Super Admin',
    isOwner: true,
    status: 'active',
    permissions: allPermissions,
    createdAt: '2026-01-02T09:00:00.000Z',
    lastLoginAt: daysAgo(1, 8),
  },
  {
    id: 'adm_orders',
    fullName: 'Order Desk (demo)',
    email: DEMO_SUBADMIN_EMAIL,
    username: 'orderdesk',
    role: 'Order Manager',
    isOwner: false,
    status: 'active',
    permissions: rolePresets['Order Manager'],
    createdAt: '2026-04-11T09:00:00.000Z',
    lastLoginAt: daysAgo(3, 9),
  },
];

/* ------------------------------------------------------------------ */
/* Specialists                                                         */
/* ------------------------------------------------------------------ */

export const seedSpecialists: Specialist[] = [
  {
    id: 'sp_a',
    name: 'Specialist A',
    title: 'Senior Nail Technician',
    image: images.nails,
    bio: '[Placeholder bio] Gel, acrylic and nail art.',
    specialties: ['Gel nails', 'Nail art'],
    serviceSlugs: ['manicure', 'pedicure', 'nail-services'],
    workingDays: [0, 1, 2, 3, 4, 5, 6],
    hours: { start: '09:00', end: '18:00' },
    status: 'active',
  },
  {
    id: 'sp_b',
    name: 'Specialist B',
    title: 'Nail Technician',
    image: images.pedicure,
    bio: '[Placeholder bio] Pedicures and spa treatments.',
    specialties: ['Pedicure', 'Spa'],
    serviceSlugs: ['manicure', 'pedicure'],
    workingDays: [0, 2, 3, 4, 5, 6],
    hours: { start: '10:00', end: '18:00' },
    status: 'active',
  },
  {
    id: 'sp_c',
    name: 'Specialist C',
    title: 'Esthetician & Lash Artist',
    image: images.lashes,
    bio: '[Placeholder bio] Facials and lash extensions.',
    specialties: ['Facials', 'Volume lashes'],
    serviceSlugs: ['facials', 'eyelash-extensions'],
    workingDays: [0, 1, 2, 3, 4, 5],
    hours: { start: '09:00', end: '17:00' },
    status: 'active',
  },
  {
    id: 'sp_d',
    name: 'Specialist D',
    title: 'Braider & Hair Therapist',
    image: images.braids,
    bio: '[Placeholder bio] Knotless braids and treatments.',
    specialties: ['Knotless braids', 'Scalp care'],
    serviceSlugs: ['braiding', 'hair-treatment'],
    workingDays: [0, 1, 3, 4, 5, 6],
    hours: { start: '08:00', end: '18:00' },
    status: 'active',
  },
  {
    id: 'sp_e',
    name: 'Specialist E',
    title: 'Wig Specialist',
    image: images.bodyWaveWig,
    bio: '[Placeholder bio] Installs, revamps and maintenance.',
    specialties: ['Frontal installs', 'Revamps'],
    serviceSlugs: ['wig-installation', 'wig-revamping', 'wig-maintenance'],
    workingDays: [0, 1, 2, 3, 4, 5, 6],
    hours: { start: '09:00', end: '18:00' },
    status: 'active',
  },
  {
    id: 'sp_f',
    name: 'Specialist F',
    title: 'Barber',
    image: images.barbing,
    bio: '[Placeholder bio] Cuts, fades and grooming.',
    specialties: ['Fades', 'Beard grooming'],
    serviceSlugs: ['barbing'],
    workingDays: [0, 2, 3, 4, 5, 6],
    hours: { start: '10:00', end: '19:00' },
    status: 'on-leave',
  },
];

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

const firstNames = [
  'Chioma',
  'Funke',
  'Amaka',
  'Tolu',
  'Ngozi',
  'Bisi',
  'Kemi',
  'Ifeoma',
  'Zainab',
  'Halima',
  'Temi',
  'Ebere',
  'Yetunde',
  'Nkechi',
  'Folake',
  'Aisha',
  'Uche',
  'Damilola',
  'Ronke',
  'Bukola',
  'Tobi',
  'Kelechi',
  'Sade',
  'Oluchi',
];
const lastNames = [
  'Okeke',
  'Adeyemi',
  'Nwosu',
  'Balogun',
  'Eze',
  'Ibrahim',
  'Okafor',
  'Bello',
  'Obi',
  'Lawal',
  'Uzo',
  'Adebayo',
];
const states = ['Lagos', 'Lagos', 'Lagos', 'Abuja', 'Rivers', 'Oyo', 'Ogun', 'Enugu', 'Anambra', 'Delta'];
const cities: Record<string, string> = {
  Lagos: 'Lekki',
  Abuja: 'Wuse II',
  Rivers: 'Port Harcourt',
  Oyo: 'Ibadan',
  Ogun: 'Abeokuta',
  Enugu: 'Independence Layout',
  Anambra: 'Awka',
  Delta: 'Asaba',
};

export const seedCustomers: User[] = firstNames.map((f, i) => {
  const l = lastNames[i % lastNames.length];
  const state = states[i % states.length];
  return {
    id: `u_c${i + 1}`,
    fullName: `${f} ${l}`,
    email: `${f.toLowerCase()}.${l.toLowerCase()}@example.com`,
    phone: `080${digits(8)}`,
    addresses: [
      {
        id: `addr_c${i + 1}`,
        label: 'Home',
        country: 'Nigeria',
        state,
        city: cities[state],
        street: `${int(2, 80)} ${pick(['Admiralty Way', 'Awolowo Road', 'Allen Avenue', 'Ademola Adetokunbo Cres.', 'Aba Road', 'Ring Road'])}`,
        isDefault: true,
      },
    ],
    createdAt: daysAgo(int(5, 240), 11),
    lastActiveAt: daysAgo(int(0, 30), 15),
    status: i === 7 || i === 19 ? 'blocked' : 'active',
  };
});

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

const allSeedProducts = [...hairProducts, ...toolProducts];

function itemFor(productIndex: number): OrderItem {
  const p = allSeedProducts[productIndex % allSeedProducts.length];
  const variants: Record<string, string> = {};
  let price = p.price;
  p.variants.forEach((g) => {
    const v = g.values[Math.min(g.values.length - 1, int(0, 2))];
    variants[g.name] = v.label;
    price += v.priceDelta ?? 0;
  });
  return {
    key: `${p.id}|${Object.values(variants).join('|')}`,
    productId: p.id,
    slug: p.slug,
    division: p.division,
    name: p.name,
    image: p.images[0],
    unitPrice: price,
    quantity: p.division === 'tools' ? int(1, 3) : 1,
    variants,
  };
}

function timelineFor(method: PaymentMethod, status: OrderStatus, placed: string): TimelineEntry[] {
  const t = new Date(placed).getTime();
  const at = (h: number) => new Date(t + h * 3600 * 1000).toISOString();
  const reached = (s: OrderStatus) => {
    const order: OrderStatus[] = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
    return order.indexOf(status) >= order.indexOf(s);
  };
  const base: TimelineEntry[] = [{ step: 'Order Placed', at: placed }];
  if (method === 'bank_transfer') {
    base.push({ step: 'Awaiting Payment', at: placed });
    base.push({ step: 'Payment Confirmed', at: reached('Confirmed') && status !== 'Cancelled' ? at(4) : null });
  }
  base.push({ step: 'Processing', at: reached('Processing') && status !== 'Cancelled' ? at(20) : null });
  base.push({ step: 'Shipped', at: reached('Shipped') && status !== 'Cancelled' ? at(44) : null });
  base.push({ step: 'Delivered', at: reached('Delivered') && status !== 'Cancelled' ? at(80) : null });
  if (status === 'Cancelled') base.push({ step: 'Cancelled', at: at(30) });
  return base;
}

export const generatedOrders: Order[] = Array.from({ length: 30 }, (_, i) => {
  const ago = Math.floor((i / 30) * 88) + int(0, 2);
  const placed = daysAgo(ago, int(8, 20));
  const c = seedCustomers[(i * 7) % seedCustomers.length];
  const guest = i % 4 === 1;
  const method: PaymentMethod = i % 3 === 0 ? 'pay_on_delivery' : 'bank_transfer';
  let status: OrderStatus;
  if (ago <= 3) status = method === 'bank_transfer' ? 'Pending' : i % 2 ? 'Pending' : 'Processing';
  else if (ago <= 10) status = pick(['Confirmed', 'Processing', 'Shipped', 'Pending']);
  else status = i % 11 === 0 ? 'Cancelled' : 'Delivered';
  const items = [itemFor(i * 3), ...(i % 2 ? [itemFor(i * 5 + 17)] : [])];
  const subtotal = items.reduce((s, x) => s + x.unitPrice * x.quantity, 0);
  const deliveryFee = c.addresses[0].state === 'Lagos' ? 3500 : 6000;
  const paymentStatus =
    method === 'pay_on_delivery'
      ? status === 'Delivered'
        ? 'Paid'
        : 'Pay on Delivery'
      : status === 'Pending' || status === 'Cancelled'
        ? 'Pending Verification'
        : 'Payment Confirmed';
  return {
    orderNumber: `LXC-${700100 + i * 137}`,
    reference: digits(8),
    createdAt: placed,
    customer: { fullName: c.fullName, email: c.email, phone: c.phone },
    address: c.addresses[0],
    items,
    subtotal,
    deliveryFee,
    discount: 0,
    total: subtotal + deliveryFee,
    paymentMethod: method,
    paymentStatus,
    status,
    timeline: timelineFor(method, status, placed),
    accountEmail: guest ? undefined : c.email,
    confirmedBy: status !== 'Pending' && method === 'bank_transfer' ? 'LUXICHIC Admin' : undefined,
  } as Order;
});

/* ------------------------------------------------------------------ */
/* Appointments                                                        */
/* ------------------------------------------------------------------ */

const serviceNames: Record<string, string> = {
  manicure: 'Manicure',
  pedicure: 'Pedicure',
  facials: 'Facials',
  'eyelash-extensions': 'Eyelash Extensions',
  'nail-services': 'Nail Services',
  braiding: 'Braiding',
  'hair-treatment': 'Hair Treatment',
  barbing: 'Barbing',
  'wig-installation': 'Wig Installation',
  'wig-revamping': 'Wig Revamping',
  'wig-maintenance': 'Wig Maintenance',
};
const serviceWeights = [
  'nail-services',
  'nail-services',
  'manicure',
  'manicure',
  'pedicure',
  'braiding',
  'braiding',
  'braiding',
  'eyelash-extensions',
  'facials',
  'wig-installation',
  'wig-installation',
  'wig-revamping',
  'hair-treatment',
  'barbing',
  'wig-maintenance',
];
const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

export const generatedAppointments: Appointment[] = Array.from({ length: 40 }, (_, i) => {
  const offset = Math.round(-30 + (i / 40) * 52);
  let date = dateOffset(offset);
  if (new Date(`${date}T12:00:00Z`).getUTCDay() === 0) date = dateOffset(offset + 1);
  const slug = serviceWeights[i % serviceWeights.length];
  const sp = seedSpecialists.find((s) => s.serviceSlugs.includes(slug));
  const c = seedCustomers[(i * 5) % seedCustomers.length];
  let status: AppointmentStatus;
  if (offset < 0) status = i % 9 === 0 ? 'Cancelled' : i % 13 === 0 ? 'Rejected' : 'Completed';
  else if (offset <= 2) status = i % 3 === 0 ? 'Pending' : 'Confirmed';
  else status = i % 4 === 0 ? 'Rescheduled' : i % 2 === 0 ? 'Pending' : 'Confirmed';
  const created = daysAgo(Math.max(1, -offset + int(2, 6)), 12);
  return {
    reference: `APT-${500100 + i * 211}`,
    serviceSlug: slug,
    serviceName: serviceNames[slug],
    date,
    time: times[i % times.length],
    personnelId: i % 5 === 0 ? undefined : sp?.id,
    personnelName: i % 5 === 0 ? undefined : sp?.name,
    customer: { fullName: c.fullName, email: c.email, phone: c.phone },
    status,
    createdAt: created,
    accountEmail: c.email,
    reason:
      status === 'Rejected'
        ? 'Selected specialist unavailable.'
        : status === 'Rescheduled'
          ? 'Specialist schedule change.'
          : undefined,
    history: [{ at: created, label: 'Appointment requested' }],
  };
});

export const generatedReviews: Review[] = [
  {
    id: 'r7',
    productId: 'h3',
    authorName: 'Chioma O.',
    authorEmail: seedCustomers[0].email,
    rating: 5,
    title: 'Gorgeous waves',
    body: 'The 360 lace made my high ponytail look so natural.',
    verified: true,
    date: dateOffset(-12),
    status: 'visible',
  },
  {
    id: 'r8',
    productId: 't1',
    authorName: 'Funke A.',
    authorEmail: seedCustomers[1].email,
    rating: 4,
    title: 'Powerful dryer',
    body: 'Dries quickly and the diffuser is great for curls.',
    verified: true,
    date: dateOffset(-9),
    status: 'visible',
  },
  {
    id: 'r9',
    productId: 'h1',
    authorName: 'Unknown',
    rating: 1,
    title: 'BUY CHEAP HAIR AT MY LINK',
    body: 'Visit my page for cheaper hair!!! (spam example)',
    verified: false,
    date: dateOffset(-2),
    status: 'visible',
  },
  {
    id: 'r10',
    productId: 't16',
    authorName: 'Tolu B.',
    authorEmail: seedCustomers[3].email,
    rating: 5,
    title: 'Soft and tangle free',
    body: 'Did my knotless braids with 6 packs, no itching at all.',
    verified: true,
    date: dateOffset(-5),
    status: 'visible',
  },
  {
    id: 'r11',
    productId: 'h5',
    authorName: 'Ngozi E.',
    authorEmail: seedCustomers[4].email,
    rating: 3,
    title: 'Nice but shed a little',
    body: 'Pretty closure, slight shedding after the first wash.',
    verified: true,
    date: dateOffset(-20),
    status: 'hidden',
  },
];

/* ------------------------------------------------------------------ */
/* Email templates                                                     */
/* ------------------------------------------------------------------ */

const tpl = (id: string, name: string, subject: string, body: string, variables: string[]): EmailTemplate => ({
  id,
  name,
  subject,
  body,
  variables,
  enabled: true,
});

export const seedEmailTemplates: EmailTemplate[] = [
  tpl(
    'welcome',
    'Welcome email',
    'Welcome to LUXICHIC, {{customer_name}}',
    'Hi {{customer_name}},\n\nWelcome to LUXICHIC. Your account is ready — track orders, save addresses and manage appointments in one place.\n\nWith love,\nLUXICHIC',
    ['customer_name'],
  ),
  tpl(
    'order_placed',
    'Order placed',
    'We received your order {{order_number}}',
    'Hi {{customer_name}},\n\nThank you for your order {{order_number}}.\nTransaction reference: {{transaction_reference}}\nTotal: {{total_amount}}\n\nWe will update you as soon as it is confirmed.',
    ['customer_name', 'order_number', 'transaction_reference', 'total_amount'],
  ),
  tpl(
    'payment_pending',
    'Payment pending',
    'Complete your payment for {{order_number}}',
    'Hi {{customer_name}},\n\nPlease transfer {{total_amount}} and use {{transaction_reference}} as your narration. Then send your receipt on WhatsApp.',
    ['customer_name', 'order_number', 'transaction_reference', 'total_amount'],
  ),
  tpl(
    'order_confirmed',
    'Order confirmed',
    'Your order {{order_number}} is confirmed',
    'Hi {{customer_name}},\n\nGreat news — your order {{order_number}} has been confirmed and is being prepared.\n\n{{account_link}}',
    ['customer_name', 'order_number', 'transaction_reference', 'account_link'],
  ),
  tpl(
    'payment_confirmed',
    'Payment confirmed',
    'Payment received for {{order_number}}',
    'Hi {{customer_name}},\n\nWe have verified your payment of {{total_amount}} for order {{order_number}}.',
    ['customer_name', 'order_number', 'total_amount'],
  ),
  tpl(
    'order_cancelled',
    'Order cancelled',
    'Your order {{order_number}} was cancelled',
    'Hi {{customer_name}},\n\nYour order {{order_number}} has been cancelled. Reason: {{reason}}',
    ['customer_name', 'order_number', 'reason'],
  ),
  tpl(
    'appt_booked',
    'Appointment booked',
    'We received your {{service_name}} request',
    'Hi {{customer_name}},\n\nYour {{service_name}} appointment request for {{appointment_date}} at {{appointment_time}} has been received. Reference: {{appointment_reference}}.\n\nPayment is only required after your service.',
    ['customer_name', 'service_name', 'appointment_date', 'appointment_time', 'appointment_reference'],
  ),
  tpl(
    'appt_confirmed',
    'Appointment confirmed',
    'Your {{service_name}} appointment is confirmed',
    'Hi {{customer_name}},\n\nSee you on {{appointment_date}} at {{appointment_time}} with {{specialist_name}}.',
    ['customer_name', 'service_name', 'appointment_date', 'appointment_time', 'specialist_name'],
  ),
  tpl(
    'appt_rejected',
    'Appointment rejected',
    'About your {{service_name}} request',
    'Hi {{customer_name}},\n\nUnfortunately we could not accept your appointment on {{appointment_date}}. Reason: {{reason}}\n\nPlease choose another time on our website.',
    ['customer_name', 'service_name', 'appointment_date', 'reason'],
  ),
  tpl(
    'appt_rescheduled',
    'Appointment rescheduled',
    'Your LUXICHIC appointment has been rescheduled',
    'Hi {{customer_name}},\n\nYour {{service_name}} appointment has moved.\nOriginal: {{original_date}} at {{original_time}}\nNew: {{appointment_date}} at {{appointment_time}}\nSpecialist: {{specialist_name}}\nReason: {{reason}}',
    [
      'customer_name',
      'service_name',
      'original_date',
      'original_time',
      'appointment_date',
      'appointment_time',
      'specialist_name',
      'reason',
    ],
  ),
  tpl(
    'appt_reminder',
    'Appointment reminder',
    'Reminder: {{service_name}} tomorrow',
    'Hi {{customer_name}},\n\nA friendly reminder of your {{service_name}} appointment on {{appointment_date}} at {{appointment_time}}.',
    ['customer_name', 'service_name', 'appointment_date', 'appointment_time'],
  ),
  tpl(
    'password_reset',
    'Password reset',
    'Reset your LUXICHIC password',
    'Hi {{customer_name}},\n\nUse this secure link to reset your password: {{reset_link}}\nThis link expires in 1 hour.',
    ['customer_name', 'reset_link'],
  ),
  tpl(
    'admin_login',
    'Admin login alert',
    'Your LUXICHIC administrator account was just logged in',
    'Hi {{admin_name}},\n\nYour LUXICHIC administrator account ({{admin_email}}) was just logged in on {{login_date}} at {{login_time}} using {{device}}.\n\nIf this wasn’t you, change your password immediately and contact the main administrator.',
    ['admin_name', 'admin_email', 'login_date', 'login_time', 'device'],
  ),
  tpl(
    'account_invite',
    'Account creation invitation',
    'Create your LUXICHIC account',
    'Hi {{customer_name}},\n\nYour order {{order_number}} is confirmed! Create your account to track it: {{account_link}}',
    ['customer_name', 'order_number', 'account_link'],
  ),
];

export const sampleTemplateValues: Record<string, string> = {
  customer_name: 'Chioma Okeke',
  order_number: 'LXC-700237',
  transaction_reference: '58310472',
  total_amount: '₦287,500',
  appointment_date: 'Thursday, 15 October 2026',
  appointment_time: '2:00 PM',
  appointment_reference: 'APT-500311',
  service_name: 'Manicure',
  specialist_name: 'Specialist A',
  reason: 'Selected specialist unavailable.',
  original_date: 'Wednesday, 14 October 2026',
  original_time: '11:00 AM',
  account_link: 'https://luxichic.example/create-account?token=…',
  reset_link: 'https://luxichic.example/reset-password?token=…',
  admin_name: 'LUXICHIC Admin',
  admin_email: DEMO_ADMIN_EMAIL,
  login_date: '3 Oct 2026',
  login_time: '9:41 AM',
  device: 'Chrome on macOS',
};

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export const seedDiscounts: Discount[] = [
  {
    id: 'd1',
    code: 'LUXE10',
    type: 'percent',
    value: 10,
    minSpend: 0,
    startsAt: '2026-01-01',
    endsAt: '2026-12-31',
    usageLimit: null,
    used: 42,
    active: true,
    scope: 'all',
  },
  {
    id: 'd2',
    code: 'WIGWEEK',
    type: 'percent',
    value: 15,
    minSpend: 150000,
    startsAt: dateOffset(7),
    endsAt: dateOffset(14),
    usageLimit: 100,
    used: 0,
    active: true,
    scope: 'hairs',
  },
  {
    id: 'd3',
    code: 'TOOLS5K',
    type: 'fixed',
    value: 5000,
    minSpend: 40000,
    startsAt: '2026-06-01',
    endsAt: '2026-08-31',
    usageLimit: 200,
    used: 87,
    active: false,
    scope: 'tools',
  },
];

export const seedMedia: MediaItem[] = [
  ['heroModel', 'Homepage'],
  ['nails', 'Salon'],
  ['braids', 'Salon'],
  ['bodyWaveWig', 'Hairs'],
  ['curlyWig', 'Hairs'],
  ['boneStraight', 'Products'],
  ['deepWave', 'Products'],
  ['kinkyStraight', 'Products'],
  ['bundles', 'Products'],
  ['hotComb', 'Hair Tools'],
  ['hoodDryer', 'Hair Tools'],
  ['nailLamp', 'Hair Tools'],
  ['ledLamp', 'Hair Tools'],
  ['canvasHead', 'Hair Tools'],
  ['facial', 'Services'],
  ['lashes', 'Services'],
  ['pedicure', 'Services'],
  ['barbing', 'Services'],
  ['salonInterior', 'Homepage'],
].map(([key, folder], i) => ({
  id: `m${i + 1}`,
  url: images[key as keyof typeof images],
  name: `${key}.jpg`,
  folder: folder as MediaItem['folder'],
  width: 1024 + (i % 3) * 256,
  height: 1280,
  sizeKb: 180 + ((i * 47) % 420),
  uploadedAt: daysAgo(30 + i * 3),
}));

export const seedNotifications: AdminNotification[] = [
  {
    id: 'n1',
    kind: 'payment',
    title: 'Payment awaiting verification',
    body: 'Order LXC-603158 · ₦278,500 by bank transfer.',
    at: daysAgo(2, 9),
    read: false,
    link: '/admin/orders/LXC-603158',
  },
  {
    id: 'n2',
    kind: 'stock',
    title: 'Low stock',
    body: '250% density on Brazilian Bone Straight Wig has 3 units left.',
    at: daysAgo(1, 7),
    read: false,
    link: '/admin/inventory?filter=low',
  },
  {
    id: 'n3',
    kind: 'appointment',
    title: 'New appointment request',
    body: 'Braiding · requested for this week.',
    at: daysAgo(0, 9),
    read: false,
    link: '/admin/appointments?status=Pending',
  },
  {
    id: 'n4',
    kind: 'review',
    title: 'New review needs moderation',
    body: '1★ review on Brazilian Bone Straight Wig looks like spam.',
    at: daysAgo(2, 14),
    read: false,
    link: '/admin/reviews',
  },
  {
    id: 'n5',
    kind: 'customer',
    title: 'New customer',
    body: 'Oluchi Adebayo created an account.',
    at: daysAgo(4, 16),
    read: true,
    link: '/admin/customers',
  },
  {
    id: 'n6',
    kind: 'integration',
    title: 'WhatsApp API not connected',
    body: 'Admin order alerts will start once credentials are added.',
    at: daysAgo(6, 10),
    read: true,
    link: '/admin/whatsapp',
  },
];

export const seedActivity: ActivityEntry[] = [
  {
    id: 'a1',
    at: daysAgo(1, 9),
    adminId: 'adm_owner',
    adminName: 'LUXICHIC Admin',
    section: 'Orders',
    action: 'Confirmed payment',
    target: 'LXC-700100',
    link: '/admin/orders/LXC-700100',
  },
  {
    id: 'a2',
    at: daysAgo(2, 11),
    adminId: 'adm_owner',
    adminName: 'LUXICHIC Admin',
    section: 'Products',
    action: 'Changed price',
    target: '13x4 Body Wave Frontal Wig',
  },
  {
    id: 'a3',
    at: daysAgo(3, 15),
    adminId: 'adm_orders',
    adminName: 'Order Desk (demo)',
    section: 'Orders',
    action: 'Marked as shipped',
    target: 'LXC-700237',
  },
  {
    id: 'a4',
    at: daysAgo(4, 10),
    adminId: 'adm_owner',
    adminName: 'LUXICHIC Admin',
    section: 'Delivery',
    action: 'Changed delivery fee',
    target: 'Rivers · ₦6,500',
  },
  {
    id: 'a5',
    at: daysAgo(6, 13),
    adminId: 'adm_owner',
    adminName: 'LUXICHIC Admin',
    section: 'Admin Users',
    action: 'Created sub-admin',
    target: 'Order Desk (demo)',
  },
  {
    id: 'a6',
    at: daysAgo(8, 12),
    adminId: 'adm_owner',
    adminName: 'LUXICHIC Admin',
    section: 'Content',
    action: 'Edited homepage hero',
    target: 'Homepage',
  },
];

export const seedLoginHistory: LoginEntry[] = [
  {
    id: 'l1',
    adminId: 'adm_owner',
    adminName: 'LUXICHIC Admin',
    email: DEMO_ADMIN_EMAIL,
    at: daysAgo(1, 8),
    browser: 'Chrome 129',
    device: 'macOS · Desktop',
    location: 'Lagos, NG (approx.)',
  },
  {
    id: 'l2',
    adminId: 'adm_orders',
    adminName: 'Order Desk (demo)',
    email: DEMO_SUBADMIN_EMAIL,
    at: daysAgo(3, 9),
    browser: 'Safari 18',
    device: 'iPhone · Mobile',
    location: 'Lagos, NG (approx.)',
  },
  {
    id: 'l3',
    adminId: 'adm_owner',
    adminName: 'LUXICHIC Admin',
    email: DEMO_ADMIN_EMAIL,
    at: daysAgo(5, 19),
    browser: 'Chrome 129',
    device: 'Windows · Desktop',
    location: 'Abuja, NG (approx.)',
  },
];
