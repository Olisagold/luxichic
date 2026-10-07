import type { Order } from '../types/order';
import type { Appointment } from '../types/salon';
import type { Review, User } from '../types/user';
import { images } from './images';

/** Demo account: demo@luxichic.com / Luxichic123 */
export const DEMO_EMAIL = 'demo@luxichic.com';
export const DEMO_PASSWORD = 'Luxichic123';

const demoAddress = {
  id: 'addr_demo1', label: 'Home', country: 'Nigeria', state: 'Lagos', city: 'Lekki',
  street: '12 Admiralty Way', houseNumber: 'Flat 4B', landmark: 'Opposite the pharmacy', isDefault: true
};

const demoCustomer = { fullName: 'Ada Okafor', email: DEMO_EMAIL, phone: '08031234567' };

export const seedUsers: User[] = [
{
  id: 'u_demo', fullName: demoCustomer.fullName, email: DEMO_EMAIL, phone: demoCustomer.phone,
  password: DEMO_PASSWORD, addresses: [demoAddress], createdAt: '2026-01-12T10:00:00.000Z'
}];


export const seedOrders: Order[] = [
{
  orderNumber: 'LXC-482913', reference: '58310472', createdAt: '2026-08-14T11:20:00.000Z',
  customer: demoCustomer, address: demoAddress,
  items: [
  { key: 'h1|length:22 inches|density:180%|cap:Medium', productId: 'h1', slug: 'brazilian-bone-straight-wig', division: 'hairs', name: 'Brazilian Bone Straight Wig', image: images.boneStraight, unitPrice: 265000, quantity: 1, variants: { Length: '22 inches', Density: '180%', 'Cap Size': 'Medium' } },
  { key: 't14|size:38ml', productId: 't14', slug: 'lace-glue-pro-hold', division: 'tools', name: 'Lace Glue — Pro Hold', image: images.wigAccessories, unitPrice: 9500, quantity: 2, variants: { Size: '38ml' } }],

  subtotal: 284000, deliveryFee: 3500, discount: 0, total: 287500,
  paymentMethod: 'bank_transfer', paymentStatus: 'Payment Confirmed', status: 'Delivered',
  timeline: [
  { step: 'Order Placed', at: '2026-08-14T11:20:00.000Z' },
  { step: 'Awaiting Payment', at: '2026-08-14T11:20:00.000Z' },
  { step: 'Payment Confirmed', at: '2026-08-14T15:02:00.000Z' },
  { step: 'Processing', at: '2026-08-15T09:00:00.000Z' },
  { step: 'Shipped', at: '2026-08-16T08:30:00.000Z' },
  { step: 'Delivered', at: '2026-08-17T14:10:00.000Z' }],

  accountEmail: DEMO_EMAIL
},
{
  orderNumber: 'LXC-517204', reference: '90418263', createdAt: '2026-09-26T16:45:00.000Z',
  customer: demoCustomer, address: demoAddress,
  items: [
  { key: 't3', productId: 't3', slug: 'sonar-electric-hot-comb', division: 'tools', name: 'Sonar Electric Hot Comb SN-5248', image: images.hotComb, unitPrice: 24500, quantity: 1, variants: {} },
  { key: 't9|size:22 inches', productId: 't9', slug: 'wig-making-canvas-block-head', division: 'tools', name: 'Wig-Making Canvas Block Head', image: images.canvasHead, unitPrice: 18500, quantity: 1, variants: { Size: '22 inches' } }],

  subtotal: 43000, deliveryFee: 3500, discount: 0, total: 46500,
  paymentMethod: 'pay_on_delivery', paymentStatus: 'Pay on Delivery', status: 'Processing',
  timeline: [
  { step: 'Order Placed', at: '2026-09-26T16:45:00.000Z' },
  { step: 'Processing', at: '2026-09-27T10:15:00.000Z' },
  { step: 'Shipped', at: null },
  { step: 'Delivered', at: null }],

  accountEmail: DEMO_EMAIL
},
{
  orderNumber: 'LXC-603158', reference: '27593014', createdAt: '2026-10-01T09:05:00.000Z',
  customer: demoCustomer, address: demoAddress,
  items: [
  { key: 'h2|length:20 inches|density:150%|colour:Natural Black', productId: 'h2', slug: '13x4-body-wave-frontal-wig', division: 'hairs', name: '13x4 Body Wave Frontal Wig', image: images.bodyWaveWig, unitPrice: 275000, quantity: 1, variants: { Length: '20 inches', Density: '150%', Colour: 'Natural Black' } }],

  subtotal: 275000, deliveryFee: 3500, discount: 0, total: 278500,
  paymentMethod: 'bank_transfer', paymentStatus: 'Pending Verification', status: 'Pending',
  timeline: [
  { step: 'Order Placed', at: '2026-10-01T09:05:00.000Z' },
  { step: 'Awaiting Payment', at: '2026-10-01T09:05:00.000Z' },
  { step: 'Payment Confirmed', at: null },
  { step: 'Processing', at: null },
  { step: 'Shipped', at: null },
  { step: 'Delivered', at: null }],

  accountEmail: DEMO_EMAIL
}];


export const seedAppointments: Appointment[] = [
{
  reference: 'APT-310245', serviceSlug: 'nail-services', serviceName: 'Nail Services', date: '2026-10-09', time: '14:00',
  personnelId: 'nail-1', personnelName: '[Nail Artist 1 — to be confirmed]', customer: demoCustomer,
  status: 'Confirmed', createdAt: '2026-09-29T12:00:00.000Z', accountEmail: DEMO_EMAIL
},
{
  reference: 'APT-288104', serviceSlug: 'facials', serviceName: 'Facials', date: '2026-08-22', time: '11:00',
  customer: demoCustomer, status: 'Completed', createdAt: '2026-08-18T09:30:00.000Z', accountEmail: DEMO_EMAIL
}];


export const seedReviews: Review[] = [
{ id: 'r1', productId: 'h1', authorName: 'Ada O.', authorEmail: DEMO_EMAIL, rating: 5, title: 'Melted perfectly', body: 'The lace is so thin and the hair is incredibly soft. I installed it myself and nobody could tell.', verified: true, date: '2026-08-20' },
{ id: 'r2', productId: 'h1', authorName: 'Sample Customer', rating: 5, title: 'My favourite unit', body: 'Silky, no shedding after three washes. Will reorder in a longer length.', verified: false, date: '2026-07-11' },
{ id: 'r3', productId: 'h1', authorName: 'Sample Customer', rating: 4, title: 'Beautiful hair', body: 'Gorgeous hair. The cap ran a little large for me but the straps fixed it.', verified: false, date: '2026-06-30' },
{ id: 'r4', productId: 'h2', authorName: 'Sample Customer', rating: 5, title: 'So much bounce', body: 'The waves hold all day and refresh beautifully with water.', verified: false, date: '2026-08-02' },
{ id: 'r5', productId: 't3', authorName: 'Sample Customer', rating: 5, title: 'Heats up fast', body: 'Perfect for revamping my bone straight wigs. Very sturdy.', verified: false, date: '2026-09-01' },
{ id: 'r6', productId: 't9', authorName: 'Sample Customer', rating: 4, title: 'Holds pins well', body: 'Firm and well made. Fits my tripod perfectly.', verified: false, date: '2026-07-19' }];