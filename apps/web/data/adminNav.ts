import type { LucideIcon } from 'lucide-react';
import {
  SendIcon,
  ActivityIcon,
  BarChart3Icon,
  BellIcon,
  BoxesIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  CircleUserIcon,
  ClipboardListIcon,
  CreditCardIcon,
  FileTextIcon,
  FolderTreeIcon,
  HelpCircleIcon,
  HomeIcon,
  ImageIcon,
  InfoIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MailIcon,
  NewspaperIcon,
  MessageCircleIcon,
  PackageIcon,
  PercentIcon,
  ScissorsIcon,
  SettingsIcon,
  ShoppingBagIcon,
  SparklesIcon,
  StarIcon,
  TruckIcon,
  UserCogIcon,
  UsersIcon,
  Building2Icon,
  InstagramIcon,
  LockIcon,
  CalendarOffIcon,
} from 'lucide-react';
import type { Permission } from '@/types/admin';

export type NavBadge = 'pendingOrders' | 'pendingAppointments' | 'lowStock' | 'unread' | 'hiddenReviews';

export interface AdminNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: Permission;
  badge?: NavBadge;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const adminNav: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboardIcon, permission: 'dashboard.view' },
      { label: 'Analytics', to: '/admin/analytics', icon: BarChart3Icon, permission: 'analytics.view' },
    ],
  },
  {
    label: 'E-commerce',
    items: [
      {
        label: 'Orders',
        to: '/admin/orders',
        icon: ShoppingBagIcon,
        permission: 'orders.view',
        badge: 'pendingOrders',
      },
      { label: 'Products', to: '/admin/products', icon: PackageIcon, permission: 'products.view' },
      { label: 'Categories', to: '/admin/categories', icon: FolderTreeIcon, permission: 'categories.manage' },
      {
        label: 'Inventory',
        to: '/admin/inventory',
        icon: BoxesIcon,
        permission: 'inventory.manage',
        badge: 'lowStock',
      },
      { label: 'Reviews', to: '/admin/reviews', icon: StarIcon, permission: 'reviews.view' },
      { label: 'Discounts', to: '/admin/discounts', icon: PercentIcon, permission: 'discounts.manage' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Customers', to: '/admin/customers', icon: UsersIcon, permission: 'customers.view' },
      { label: 'Customer Activity', to: '/admin/customer-activity', icon: ActivityIcon, permission: 'customers.view' },
      { label: 'Newsletter', to: '/admin/newsletter', icon: NewspaperIcon, permission: 'customers.view' },
    ],
  },
  {
    label: 'Beauty Salon & Spa',
    items: [
      {
        label: 'Appointments',
        to: '/admin/appointments',
        icon: CalendarClockIcon,
        permission: 'appointments.view',
        badge: 'pendingAppointments',
      },
      { label: 'Calendar', to: '/admin/calendar', icon: CalendarDaysIcon, permission: 'appointments.view' },
      { label: 'Services', to: '/admin/salon/services', icon: ScissorsIcon, permission: 'salon.services' },
      { label: 'Specialists', to: '/admin/salon/specialists', icon: SparklesIcon, permission: 'salon.specialists' },
      {
        label: 'Availability',
        to: '/admin/salon/availability',
        icon: CalendarOffIcon,
        permission: 'salon.availability',
      },
    ],
  },
  {
    label: 'Website',
    items: [
      { label: 'Homepage', to: '/admin/website/homepage', icon: HomeIcon, permission: 'content.homepage' },
      { label: 'About', to: '/admin/website/about', icon: InfoIcon, permission: 'content.pages' },
      { label: 'FAQs', to: '/admin/website/faqs', icon: HelpCircleIcon, permission: 'content.pages' },
      { label: 'Contact & Policies', to: '/admin/website/pages', icon: FileTextIcon, permission: 'content.pages' },
      { label: 'Media Library', to: '/admin/website/media', icon: ImageIcon, permission: 'content.media' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Delivery', to: '/admin/delivery', icon: TruckIcon, permission: 'settings.delivery' },
      { label: 'Payments', to: '/admin/payments', icon: CreditCardIcon, permission: 'settings.payment' },
      { label: 'Telegram', to: '/admin/telegram', icon: SendIcon, permission: 'settings.general' },
      { label: 'WhatsApp', to: '/admin/whatsapp', icon: MessageCircleIcon, permission: 'settings.whatsapp' },
      { label: 'Email', to: '/admin/email', icon: MailIcon, permission: 'settings.email' },
      { label: 'Notifications', to: '/admin/notifications', icon: BellIcon, badge: 'unread' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Admin Users', to: '/admin/admin-users', icon: UserCogIcon, permission: 'admins.manage' },
      { label: 'Roles & Permissions', to: '/admin/roles', icon: KeyRoundIcon, permission: 'admins.manage' },
      { label: 'Activity Logs', to: '/admin/activity', icon: ClipboardListIcon, permission: 'logs.view' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'General', to: '/admin/settings/general', icon: SettingsIcon, permission: 'settings.general' },
      {
        label: 'Business Information',
        to: '/admin/settings/business',
        icon: Building2Icon,
        permission: 'settings.general',
      },
      { label: 'Social Media', to: '/admin/settings/social', icon: InstagramIcon, permission: 'settings.general' },
      { label: 'Security', to: '/admin/settings/security', icon: LockIcon },
    ],
  },
];

export const quickActions: { label: string; to: string; icon: LucideIcon; permission?: Permission }[] = [
  { label: 'Add product', to: '/admin/products/new', icon: PackageIcon, permission: 'products.create' },
  { label: 'Create discount', to: '/admin/discounts?new=1', icon: PercentIcon, permission: 'discounts.manage' },
  {
    label: 'View pending orders',
    to: '/admin/orders?status=Pending',
    icon: ShoppingBagIcon,
    permission: 'orders.view',
  },
  { label: 'Add salon service', to: '/admin/salon/services/new', icon: ScissorsIcon, permission: 'salon.services' },
  {
    label: 'Add specialist',
    to: '/admin/salon/specialists?new=1',
    icon: SparklesIcon,
    permission: 'salon.specialists',
  },
  { label: 'View appointments', to: '/admin/appointments', icon: CalendarClockIcon, permission: 'appointments.view' },
  { label: 'Add customer', to: '/admin/customers?new=1', icon: CircleUserIcon, permission: 'customers.edit' },
  { label: 'Edit homepage', to: '/admin/website/homepage', icon: HomeIcon, permission: 'content.homepage' },
  { label: 'Delivery prices', to: '/admin/delivery', icon: TruckIcon, permission: 'settings.delivery' },
];
