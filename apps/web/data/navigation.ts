import { images } from '@/data/images';

export interface MenuColumn {
  title: string;
  links: {label: string;to: string;}[];
}

export interface MegaMenu {
  id: 'hairs' | 'tools' | 'salon';
  label: string;
  to: string;
  columns: MenuColumn[];
  feature: {image: string;title: string;text: string;cta: string;to: string;};
}

export const megaMenus: MegaMenu[] = [
{
  id: 'hairs',
  label: 'LUXICHIC Hairs',
  to: '/hairs',
  columns: [
  {
    title: 'Shop',
    links: [
    { label: 'All Hair Products', to: '/hairs/shop/all' },
    { label: 'Wigs', to: '/hairs/shop/wigs' },
    { label: 'Frontals', to: '/hairs/shop/frontals' },
    { label: 'Closures', to: '/hairs/shop/closures' },
    { label: 'Hair Bundles', to: '/hairs/shop/bundles' }]

  },
  {
    title: 'Wig Construction',
    links: [
    { label: 'Full Lace Wigs', to: '/hairs/shop/full-lace-wigs' },
    { label: '360 Lace Wigs', to: '/hairs/shop/360-lace-wigs' },
    { label: 'Full Cap Wigs', to: '/hairs/shop/full-cap-wigs' },
    { label: 'Half Cap Wigs', to: '/hairs/shop/half-cap-wigs' }]

  },
  {
    title: 'Textures & Types',
    links: [
    { label: 'Bone Straight', to: '/hairs/shop/bone-straight' },
    { label: 'Silky Straight', to: '/hairs/shop/silky-straight' },
    { label: 'Kinky Straight', to: '/hairs/shop/kinky-straight' },
    { label: 'Yaki Straight', to: '/hairs/shop/yaki-straight' },
    { label: 'Deep Wave', to: '/hairs/shop/deep-wave' },
    { label: 'Body Wave', to: '/hairs/shop/body-wave' },
    { label: 'Brazilian Hair', to: '/hairs/shop/brazilian' },
    { label: 'Virgin Hair', to: '/hairs/shop/virgin' }]

  },
  {
    title: 'Hair Services',
    links: [
    { label: 'Wig Installation', to: '/salon/services/wig-installation' },
    { label: 'Wig Revamping', to: '/salon/services/wig-revamping' },
    { label: 'Wig Maintenance', to: '/salon/services/wig-maintenance' }]

  }],

  feature: { image: images.bodyWaveWig, title: 'The Body Wave Edit', text: 'Soft, bouncy waves on HD lace.', cta: 'Shop Body Wave', to: '/hairs/shop/body-wave' }
},
{
  id: 'tools',
  label: 'Hair Tools & Essentials',
  to: '/tools',
  columns: [
  {
    title: 'Shop',
    links: [
    { label: 'All Products', to: '/tools/shop/all' },
    { label: 'New Arrivals', to: '/tools/shop/new-arrivals' },
    { label: 'Bestsellers', to: '/tools/shop/bestsellers' },
    { label: 'Special Offers', to: '/tools/shop/discounted' }]

  },
  {
    title: 'Tools & Equipment',
    links: [
    { label: 'Hair Styling Tools', to: '/tools/shop/styling-tools' },
    { label: 'Wig-Making Tools', to: '/tools/shop/wig-making' },
    { label: 'Salon Equipment', to: '/tools/shop/salon-equipment' },
    { label: 'Salon Essentials', to: '/tools/shop/salon-essentials' }]

  },
  {
    title: 'Care & Extensions',
    links: [
    { label: 'Haircare Products', to: '/tools/shop/haircare' },
    { label: 'Wig Accessories', to: '/tools/shop/wig-accessories' },
    { label: 'Braiding Extensions', to: '/tools/shop/braiding' },
    { label: 'Braiding Hair', to: '/tools/shop/pre-stretched' }]

  }],

  feature: { image: images.hotComb, title: 'Sonar Hot Comb', text: 'The pressing comb stylists swear by.', cta: 'Shop Hot Combs', to: '/tools/shop/hot-combs' }
},
{
  id: 'salon',
  label: 'Beauty Salon & Spa',
  to: '/salon',
  columns: [
  {
    title: 'Beauty',
    links: [
    { label: 'All Services', to: '/salon/services' },
    { label: 'Manicure', to: '/salon/services/manicure' },
    { label: 'Pedicure', to: '/salon/services/pedicure' },
    { label: 'Nails', to: '/salon/services/nail-services' },
    { label: 'Facials', to: '/salon/services/facials' },
    { label: 'Eyelashes', to: '/salon/services/eyelash-extensions' }]

  },
  {
    title: 'Hair & Grooming',
    links: [
    { label: 'Braiding', to: '/salon/services/braiding' },
    { label: 'Hair Treatment', to: '/salon/services/hair-treatment' },
    { label: 'Barbing', to: '/salon/services/barbing' },
    { label: 'Wig Installation', to: '/salon/services/wig-installation' },
    { label: 'Wig Revamping', to: '/salon/services/wig-revamping' },
    { label: 'Wig Maintenance', to: '/salon/services/wig-maintenance' }]

  },
  {
    title: 'Visit Us',
    links: [{ label: 'Book an Appointment', to: '/salon/book' }]
  }],

  feature: { image: images.nails, title: 'Pay after your service', text: 'Book online in a minute — no deposits.', cta: 'Book an Appointment', to: '/salon/book' }
}];