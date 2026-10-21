import type { AdminUser, Permission } from '@/types/admin';

/** The permissions an admin can be given, grouped as the admin screens show them. */
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
  /** A stylist or technician: their own bookings only (when their admin login is linked to their specialist profile). */
  Specialist: ['appointments.view', 'appointments.confirm', 'appointments.reschedule'],
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
