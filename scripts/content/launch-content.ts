/**
 * Launch content drafted for the CEO's review (2026-10-21): the four policies, the About page, three FAQ answers
 * and the delivery estimate. Nothing here is live until `pnpm content:load` writes it to a database, after the
 * CEO approves it. Policy bodies: blank lines start paragraphs, lines starting with "- " are bullet points.
 *
 * Decisions the CEO must confirm are in DECISIONS; each draft uses the suggested answer.
 */

export const DECISIONS = [
  {
    topic: 'Hair returns window',
    suggested: 'Within 3 days of delivery, unworn, lace uncut, in original packaging',
    where: 'Returns policy',
  },
  {
    topic: 'Wig tools returns window',
    suggested: 'Within 7 days of delivery, unused, in original packaging',
    where: 'Returns policy',
  },
  { topic: 'Refund timing', suggested: 'Within 7 working days of approval, by bank transfer', where: 'Returns policy' },
  {
    topic: 'Unpaid orders',
    suggested: 'Cancelled if payment isn’t received within 48 hours',
    where: 'Terms and conditions',
  },
  {
    topic: 'Store pickup',
    suggested: 'Yes, from the Ago Palace Way store, arranged on WhatsApp',
    where: 'Shipping policy',
  },
  {
    topic: 'Delivery times',
    suggested: 'Lagos 1–3 working days, elsewhere 3–7, counted from payment confirmation',
    where: 'Shipping policy, FAQ, checkout',
  },
  {
    topic: 'Late for an appointment',
    suggested: 'After 15 minutes the service may be shortened or rescheduled',
    where: 'Terms and conditions',
  },
  {
    topic: 'Salon service complaints',
    suggested: 'Tell us within 48 hours; we may offer a touch-up. Services aren’t refunded',
    where: 'Returns policy',
  },
] as const;

const CONTACT =
  'Email hello@luxichic.online, WhatsApp +234 809 671 5835, or visit us at 62a Dele Orisabiyi Street, Ago Palace Way, Lagos.';

export const POLICIES: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'Who we are',
        body: `LUXICHIC (“we”, “us”) runs luxichic.online and the LUXICHIC Salon & Spa at 62a Dele Orisabiyi Street, Ago Palace Way, Lagos. We are responsible for the personal data you share with us, and we handle it in line with the Nigeria Data Protection Act 2023.

This policy explains what we collect, why, who we share it with and the choices you have. It applies to the website, our emails and WhatsApp conversations about your orders and appointments.`,
      },
      {
        heading: 'Information we collect',
        body: `- Your details: name, email address, phone number and delivery addresses.
- Orders and payments: what you bought, delivery details, your payment reference and the transfer receipt you send us. We never see or store bank card details: payments are made by bank transfer.
- Appointments: the service, date, time and specialist you chose, and any notes you add.
- Your account: your password (stored encrypted by our sign-in provider, never readable by us), or your Google name and email if you sign in with Google.
- Reviews, contact-form messages and newsletter sign-ups you send us.
- Technical information: cookies that keep you signed in and remember your cart and wishlist, and anonymous visit statistics that don’t identify you.`,
      },
      {
        heading: 'How we use your information',
        body: `- To process, deliver and support your orders, and to manage your salon appointments.
- To contact you about them by email, WhatsApp or phone notifications (if you turn notifications on).
- To run your account, including linking orders you placed as a guest once you confirm your email.
- To send our newsletter, only if you subscribed. You can unsubscribe at any time.
- To prevent fraud, keep the website secure and improve it.
- To keep the records the law requires, such as accounting records.

We use your data because we need it to fulfil our agreement with you, because you agreed (newsletter, notifications), for our legitimate interests in running and protecting the business, or to meet legal obligations.`,
      },
      {
        heading: 'Who we share it with',
        body: `We never sell your data. We share only what each provider needs to do its job for us:
- Delivery partners: your name, phone number and delivery address.
- Supabase: our database and file storage (servers in Ireland, EU).
- Vercel: hosts the website and counts visits anonymously.
- Resend: sends our emails.
- Telegram: sends our team private alerts about new orders and appointments.
- Google: only if you choose to sign in with Google.
- Your browser’s push service (Google, Apple or Mozilla): only if you turn on phone notifications.

Some of these providers store data outside Nigeria. We use providers that protect it to the standard the Nigeria Data Protection Act requires.`,
      },
      {
        heading: 'How long we keep it',
        body: `- Order and payment records: 6 years, as Nigerian tax law requires.
- Your account and saved addresses: until you ask us to delete your account.
- Newsletter: until you unsubscribe.
- Contact-form messages: up to 2 years.`,
      },
      {
        heading: 'Your rights',
        body: `You can ask us to:
- give you a copy of your data;
- correct anything that’s wrong (you can also edit your details in your account);
- delete your data, unless we must keep it by law;
- stop using it for a purpose you object to, or withdraw consent you gave (such as the newsletter).

Contact us using the details below and we’ll reply within 30 days. If you’re unhappy with our answer, you can complain to the Nigeria Data Protection Commission (ndpc.gov.ng).`,
      },
      {
        heading: 'Security and children',
        body: `We protect your data with encrypted connections, restricted staff access and secure providers. No website is completely secure, so please keep your password private.

Our website isn’t aimed at children under 18, and we don’t knowingly collect their data.`,
      },
      {
        heading: 'Changes and contact',
        body: `We may update this policy; the latest version is always on this page.

For privacy questions or requests: ${CONTACT}`,
      },
    ],
  },

  terms: {
    title: 'Terms and Conditions',
    sections: [
      {
        heading: 'About these terms',
        body: `These terms apply when you use luxichic.online, buy from LUXICHIC Hairs or LUXICHIC Wig Tools, or book with LUXICHIC Salon & Spa. By placing an order or booking, you agree to them. Our Shipping, Returns and Privacy policies form part of these terms.`,
      },
      {
        heading: 'Your account',
        body: `You can shop and book as a guest or with an account. Keep your password private; you’re responsible for activity on your account. We may suspend an account that is used for fraud or abuse.`,
      },
      {
        heading: 'Products and prices',
        body: `We describe and photograph our products as accurately as we can. Natural hair varies slightly in texture and shade, and colours can look different on different screens.

Prices are in Naira and include any applicable taxes; the delivery fee is shown at checkout. If a price is clearly wrong, we’ll tell you before processing your order, and you can choose to continue at the correct price or cancel for a full refund.`,
      },
      {
        heading: 'Orders and payment',
        body: `Placing an order is an offer to buy. Your order is accepted when we confirm your payment, and you’ll get an email when we do.

We currently accept bank transfer to the account shown at checkout; Pay on Delivery is offered for some orders when available. Use your order reference with your transfer and send us your receipt. If we haven’t received payment within 48 hours, we may cancel the order.

If an item becomes unavailable after you’ve paid, we’ll offer a replacement or a full refund.`,
      },
      {
        heading: 'Delivery and returns',
        body: `Delivery areas, fees and timelines are in our Shipping & Delivery Policy. Returns, exchanges and refunds are covered by our Returns & Refunds Policy.`,
      },
      {
        heading: 'Salon appointments',
        body: `- Online bookings are requests until the salon confirms them; we’ll let you know by email.
- You can cancel or reschedule online any time before your appointment starts. A new time needs to be confirmed again.
- Please arrive on time. If you’re more than 15 minutes late, we may need to shorten your service or move it to another time.
- No payment is taken when you book. Salon services are paid for after the service.
- Prices shown as “from” are starting prices; the final price depends on your hair and the style you choose, and we’ll confirm it before we start.`,
      },
      {
        heading: 'Reviews and content you send',
        body: `Reviews must be honest and about your own experience. We may remove reviews that are offensive, misleading or unrelated. By submitting a review or photo, you allow us to show it on our website and social media.`,
      },
      {
        heading: 'Our content',
        body: `Photos, text, logos and designs on this website belong to LUXICHIC or are used with permission. Please don’t copy them without our written consent.`,
      },
      {
        heading: 'Liability',
        body: `We’re responsible for providing our products and services with reasonable care and skill. To the extent the law allows, our liability for any order or service is limited to the amount you paid for it, and we aren’t liable for indirect losses.

Nothing in these terms limits your rights under the Federal Competition and Consumer Protection Act 2018 or any liability that can’t be limited by law.`,
      },
      {
        heading: 'Law and contact',
        body: `These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Lagos State will settle any dispute. We may update them; the version on this page when you order applies to that order.

Questions: ${CONTACT}`,
      },
    ],
  },

  shipping: {
    title: 'Shipping & Delivery Policy',
    sections: [
      {
        heading: 'Where we deliver',
        body: `We deliver to every state in Nigeria. Choose your state at checkout to see whether delivery is available and what it costs.`,
      },
      {
        heading: 'Delivery fees',
        body: `The delivery fee depends on your state and is shown at checkout before you pay.`,
      },
      {
        heading: 'Delivery times',
        body: `- Lagos: usually 1–3 working days.
- Other states: usually 3–7 working days.

Times are counted from when we confirm your payment, not from when you place the order. You’ll get an email when your order is shipped and when it’s delivered.`,
      },
      {
        heading: 'Pickup',
        body: `You can collect your order from our store at 62a Dele Orisabiyi Street, Ago Palace Way, Lagos. Message us on WhatsApp with your order number to arrange a time.`,
      },
      {
        heading: 'Receiving your order',
        body: `Please make sure someone is available at the address and phone number you gave us. If a delivery fails because no one is available or the address is wrong, a new delivery fee may apply.

Check your package when it arrives and tell us about any problem within 48 hours, with photos if possible.`,
      },
      {
        heading: 'Changing your address',
        body: `Message us on WhatsApp with your order number as soon as possible. We can change the address until your order has shipped; the delivery fee may change if the new address is in another state.`,
      },
    ],
  },

  returns: {
    title: 'Returns & Refunds Policy',
    sections: [
      {
        heading: 'Hair: wigs, bundles and closures',
        body: `For hygiene reasons, hair can only be returned if it is:
- returned within 3 days of delivery;
- unworn and unwashed, with the lace uncut and not plucked, bleached, dyed or styled;
- in its original packaging, with any tags and accessories.

Hair that has been worn, cut, coloured, installed or altered can’t be returned.`,
      },
      {
        heading: 'Wig tools and accessories',
        body: `Tools and accessories can be returned within 7 days of delivery if they are unused and in their original packaging.`,
      },
      {
        heading: 'Wrong, damaged or faulty items',
        body: `If you receive the wrong item, or an item that is damaged or faulty, tell us within 48 hours of delivery with photos. We’ll arrange a replacement or a full refund, including the delivery fee, at no cost to you.`,
      },
      {
        heading: 'How to request a return',
        body: `- Message us on WhatsApp or email hello@luxichic.online with your order number, the item and the reason.
- We’ll reply with how to send or drop off the item.
- Unless the item was wrong or faulty, the cost of sending it back is yours.`,
      },
      {
        heading: 'Refunds and exchanges',
        body: `Once we’ve received and checked the item, we’ll tell you whether the return is approved. Approved refunds are paid by bank transfer within 7 working days, to an account in the name used for the order. The original delivery fee isn’t refunded unless the item was wrong or faulty.

Prefer an exchange? Tell us when you request the return, and we’ll exchange it for an item of the same or higher price (you pay any difference).`,
      },
      {
        heading: 'Salon services',
        body: `Salon services can’t be refunded once they’ve been carried out. If you’re not happy with a service, tell us within 48 hours; we’ll look at it with you and may offer a touch-up.`,
      },
      {
        heading: 'Contact',
        body: CONTACT,
      },
    ],
  },
};

export const ABOUT = {
  description:
    'LUXICHIC is a Lagos beauty house on Ago Palace Way that brings three specialities together under one name: LUXICHIC Hairs for premium wigs and bundles, LUXICHIC Wig Tools for the tools and essentials that keep every unit looking its best, and the LUXICHIC Salon & Spa for hair, nails, lashes, skin and grooming. Shop online with delivery across Nigeria, or visit us for a service.',
  mission:
    'To make premium beauty simple: quality hair, honest advice and expert care, all in one place you can trust.',
  vision: 'To be the beauty house Nigerian women think of first, for hair and for every appointment that follows.',
  values: [
    { title: 'Quality', text: 'We choose hair, tools and techniques we trust and would use ourselves.' },
    { title: 'Care', text: 'Every client is welcomed, listened to and looked after, online and in the salon.' },
    { title: 'Confidence', text: 'Beauty that helps you walk out feeling like your best self.' },
    { title: 'Convenience', text: 'Hair, tools and salon services in one place, with delivery nationwide.' },
  ],
};

/** New answers for the FAQ questions that still have placeholders, matched by their exact question. */
export const FAQ_ANSWERS: Record<string, string> = {
  'What payment methods are available?':
    'We accept bank transfer. After placing your order you’ll see our account details and your order reference; send us your receipt and we’ll confirm your payment and start on your order. Pay on Delivery is offered for some orders when available, and you’ll see it at checkout if it is.',
  'How long does delivery take?':
    'Lagos: usually 1–3 working days. Other states: usually 3–7 working days. Times are counted from when we confirm your payment, and we’ll email you when your order ships.',
  'Can I change my delivery address?':
    'Message us on WhatsApp with your order number as soon as possible. We can change the address until your order has shipped; the delivery fee may change if the new address is in another state.',
};

export const DELIVERY_ESTIMATE =
  'Estimated delivery: 1–3 working days in Lagos, 3–7 working days elsewhere, from payment confirmation.';
