import { images } from '@/data/images';

/**
 * Editable copy for the homepage and About page. Managed from Admin → Website.
 * services/db.ts overwrites these values at runtime with the saved content.
 */
export const siteContent = {
  sections: [
    'announcement',
    'hero',
    'intro',
    'divisions',
    'collections',
    'hairs',
    'tools',
    'salon',
    'why',
    'testimonials',
    'instagram',
    'newsletter',
  ] as string[],
  hero: {
    eyebrow: 'Premium hair · Salon & spa · Hair tools & essentials',
    line1: 'Your beauty.',
    line2: 'Your confidence.',
    accent: 'Your LUXICHIC.',
    text: 'Discover premium hair, professional beauty services and everything you need to look and feel your best. Experience beauty without compromise.',
    primaryCta: 'Explore Our Collections',
    secondaryCta: 'Book an Appointment',
    image: images.heroModel,
  },
  intro: {
    heading: 'Beauty,',
    accent: 'redefined.',
    text: 'At LUXICHIC, we bring together everything you need to express your beauty. From premium hair and professional beauty treatments to quality haircare essentials, we make it easier to look and feel your best.',
  },
  about: {
    title: 'One beauty house.',
    accent: 'Three specialities.',
    intro:
      'At LUXICHIC, we bring together everything you need to express your beauty: premium hair, professional beauty treatments and quality haircare essentials, all under one name.',
    description: '[Editable placeholder: add LUXICHIC’s own story, mission and location here.]',
    mission: '',
    vision: '',
    image: images.heroModel,
    cta: 'Shop LUXICHIC Hairs',
  },
};

export const announcements = [
  'Welcome to LUXICHIC',
  'Discover Your Perfect Hair',
  'Premium Beauty, All in One Place',
  'Explore Our Latest Collections',
  'Book Your Next Beauty Appointment',
];

export const whyChoose = [
  {
    title: 'Quality Beauty Products',
    text: 'Carefully selected hair, tools and essentials we would proudly use ourselves.',
  },
  {
    title: 'Professional Salon Services',
    text: 'Skilled specialists for nails, lashes, skin, braids, grooming and wig care.',
  },
  {
    title: 'Convenient Online Shopping',
    text: 'One cart for hair and tools, guest checkout, and simple payment options.',
  },
  { title: 'Personalised Customer Care', text: 'Real people on WhatsApp ready to help you choose, book and track.' },
  {
    title: 'Everything Beauty in One Place',
    text: 'From your wig to your nails to your styling tools, all at LUXICHIC.',
  },
];

/** PLACEHOLDER testimonials for demonstration — replace with genuine customer reviews. */
export const testimonials = [
  {
    name: 'Customer A.',
    initials: 'CA',
    rating: 5,
    item: 'Brazilian Bone Straight Wig',
    text: 'The hair is so soft and the lace melted perfectly. I have received compliments everywhere I go.',
  },
  {
    name: 'Customer B.',
    initials: 'CB',
    rating: 5,
    item: 'Nail Services',
    text: 'My nails have never looked this good. The attention to detail was beautiful and the salon is so calming.',
  },
  {
    name: 'Customer C.',
    initials: 'CC',
    rating: 4,
    item: 'Wig-Making Canvas Block Head',
    text: 'Sturdy, holds pins well and arrived quickly. Exactly what I needed for my wig business.',
  },
  {
    name: 'Customer D.',
    initials: 'CD',
    rating: 5,
    item: 'Braiding',
    text: 'Neat, light and not too tight. I left feeling like a whole new person.',
  },
];

export const instagramGalleries = [
  {
    id: 'hairs' as const,
    title: 'LUXICHIC Hairs',
    images: [images.bodyWaveWig, images.curlyWig, images.boneStraight, images.heroModel],
  },
  {
    id: 'salon' as const,
    title: 'Beauty Salon & Spa',
    images: [images.nails, images.braids, images.lashes, images.facial],
  },
  {
    id: 'tools' as const,
    title: 'Hair Tools & Essentials',
    images: [images.hotComb, images.hoodDryer, images.nailLamp, images.ledLamp],
  },
];

export const faqs = [
  {
    category: 'Orders',
    items: [
      {
        q: 'How do I place an order?',
        a: 'Browse LUXICHIC Hairs or Hair Tools & Essentials, choose your options, add items to your cart and proceed to checkout. You can buy from both stores in one order.',
      },
      {
        q: 'Can I order without creating an account?',
        a: 'Yes. Guest checkout is always available. Once your order is confirmed, we will invite you to create an account so you can track it and save your details.',
      },
      {
        q: 'How can I track my order?',
        a: 'Use the Track Order page with your order number and email address, or sign in to view your full order history.',
      },
    ],
  },
  {
    category: 'Payments',
    items: [
      {
        q: 'What payment methods are available?',
        a: 'Bank Transfer, and Pay on Delivery where it is enabled. [Placeholder: final payment options to be confirmed by LUXICHIC.]',
      },
      {
        q: 'How do I make a bank transfer?',
        a: 'After placing your order, transfer the exact amount to the account shown and use your eight-digit LUXICHIC transaction reference as the narration.',
      },
      {
        q: 'How do I submit my payment receipt?',
        a: 'Tap “Send Payment Receipt on WhatsApp” on your order confirmation and attach your receipt in the chat. Your order is confirmed once the payment is verified.',
      },
    ],
  },
  {
    category: 'Delivery',
    items: [
      {
        q: 'How long does delivery take?',
        a: '[Placeholder] Delivery timelines depend on your location and will be confirmed by LUXICHIC.',
      },
      {
        q: 'Can I change my delivery address?',
        a: '[Placeholder] Contact us on WhatsApp as soon as possible with your order number. Changes may not be possible once an order has shipped.',
      },
    ],
  },
  {
    category: 'Products',
    items: [
      {
        q: 'How do I select the right wig?',
        a: 'Consider your preferred texture, length, lace type and how you like to wear your hair. Our team is happy to guide you on WhatsApp.',
      },
      {
        q: 'Can I choose a different hair length?',
        a: 'Yes. Most units are available in several lengths. Select your preferred length on the product page and the price updates automatically.',
      },
      {
        q: 'How do I care for my wig?',
        a: 'Wash gently with sulphate-free products, condition regularly, use heat protection and store on a stand. Our Wig Maintenance service can help.',
      },
    ],
  },
  {
    category: 'Appointments',
    items: [
      {
        q: 'How do I book an appointment?',
        a: 'Choose a service, pick an available date and time, and enter your details. Our team will contact you to confirm.',
      },
      {
        q: 'Do I have to pay when booking?',
        a: 'No. You never pay online for salon services. Payment is only required after your service has been provided.',
      },
      {
        q: 'Can I contact the personnel handling my service?',
        a: 'Yes. Every service has a WhatsApp button that connects you with the team responsible for it.',
      },
    ],
  },
];

export const policies: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'Information we collect',
        body: '[Placeholder] Describe the personal information LUXICHIC collects, such as name, contact details, delivery addresses and order history.',
      },
      {
        heading: 'How we use your information',
        body: '[Placeholder] Explain how information is used to process orders, manage appointments and communicate with customers.',
      },
      {
        heading: 'Sharing your information',
        body: '[Placeholder] Describe any third parties involved, such as delivery partners or messaging providers.',
      },
      {
        heading: 'Your rights',
        body: '[Placeholder] Explain how customers can access, update or delete their information.',
      },
      { heading: 'Contact', body: '[Placeholder] Provide the contact details for privacy enquiries.' },
    ],
  },
  terms: {
    title: 'Terms and Conditions',
    sections: [
      { heading: 'Using this website', body: '[Placeholder] Terms governing the use of the LUXICHIC website.' },
      {
        heading: 'Orders and pricing',
        body: '[Placeholder] How orders are accepted, how pricing errors are handled and when an order is considered confirmed.',
      },
      { heading: 'Payments', body: '[Placeholder] Accepted payment methods and verification procedures.' },
      {
        heading: 'Salon appointments',
        body: '[Placeholder] Booking, rescheduling, lateness and cancellation terms. Payment for salon services is due after the service is provided.',
      },
      { heading: 'Limitation of liability', body: '[Placeholder] To be drafted by LUXICHIC’s legal adviser.' },
    ],
  },
  shipping: {
    title: 'Shipping & Delivery Policy',
    sections: [
      { heading: 'Delivery areas', body: '[Placeholder] Where LUXICHIC delivers and any areas excluded.' },
      {
        heading: 'Delivery fees',
        body: '[Placeholder] Delivery fees are calculated by state at checkout. Final fees to be confirmed.',
      },
      { heading: 'Delivery timelines', body: '[Placeholder] Estimated timelines for Lagos and other states.' },
      { heading: 'Pickup', body: '[Placeholder] Whether orders can be collected in store and how.' },
    ],
  },
  returns: {
    title: 'Returns & Refunds Policy',
    sections: [
      {
        heading: 'Eligibility',
        body: '[Placeholder] Conditions for returns, for example, hair units must be unworn with lace uncut.',
      },
      { heading: 'How to request a return', body: '[Placeholder] Steps and timelines for requesting a return.' },
      { heading: 'Refunds', body: '[Placeholder] How and when refunds are processed.' },
      { heading: 'Exchanges', body: '[Placeholder] Whether exchanges are available.' },
    ],
  },
};

export const brandValues = [
  { title: 'Quality', text: '[Editable] We choose products and techniques we trust.' },
  { title: 'Care', text: '[Editable] Every client is welcomed, listened to and looked after.' },
  { title: 'Confidence', text: '[Editable] Beauty that helps you feel like your best self.' },
  { title: 'Convenience', text: '[Editable] Hair, beauty and tools, all in one place.' },
];
