import type { Personnel, SalonService } from '@/types/salon';
import { images } from '@/data/images';

/** Placeholder personnel — replace with LUXICHIC's real team. */
function team(prefix: string, role: string): Personnel[] {
  return [
    { id: `${prefix}-1`, name: `[${role} 1, to be confirmed]`, role },
    { id: `${prefix}-2`, name: `[${role} 2, to be confirmed]`, role },
  ];
}

/**
 * Service prices, durations, personnel and WhatsApp numbers are placeholders.
 * `startingPrice: null` renders as "Price on request".
 */
export const salonServices: SalonService[] = [
  {
    slug: 'manicure',
    name: 'Manicure',
    category: 'Nails',
    shortDescription: 'Shaping, cuticle care and a flawless polish finish.',
    description:
      'Treat your hands to a relaxing manicure: nail shaping, cuticle care, a soothing hand massage and your choice of classic or gel polish.',
    includes: ['Nail shaping and filing', 'Cuticle care', 'Hand massage', 'Classic or gel polish'],
    startingPrice: null,
    duration: 'Approx. 45 min (to be confirmed)',
    image: images.nails,
    personnel: team('mani', 'Nail Technician'),
    whatsapp: '2340000000010',
  },
  {
    slug: 'pedicure',
    name: 'Pedicure',
    category: 'Nails',
    shortDescription: 'A soothing foot soak, exfoliation and flawless polish.',
    description:
      'Relax with a warm foot soak, gentle exfoliation, callus care and a calming massage, finished with polish of your choice.',
    includes: ['Warm foot soak', 'Exfoliation and callus care', 'Foot and calf massage', 'Polish application'],
    startingPrice: null,
    duration: 'Approx. 60 min (to be confirmed)',
    image: images.pedicure,
    personnel: team('pedi', 'Nail Technician'),
    whatsapp: '2340000000011',
  },
  {
    slug: 'facials',
    name: 'Facials',
    category: 'Skin',
    shortDescription: 'Deep cleansing and glow-restoring facial treatments.',
    description: 'Tailored facials that cleanse, exfoliate and hydrate, leaving your skin calm, refreshed and radiant.',
    includes: ['Skin consultation', 'Cleanse and exfoliation', 'Treatment mask', 'Hydration and finish'],
    startingPrice: null,
    duration: 'Approx. 60–75 min (to be confirmed)',
    image: images.facial,
    personnel: team('face', 'Esthetician'),
    whatsapp: '2340000000012',
  },
  {
    slug: 'eyelash-extensions',
    name: 'Eyelash Extensions',
    category: 'Lashes',
    shortDescription: 'Classic, hybrid and volume sets for effortless glamour.',
    description:
      'Wake up camera-ready. Choose a classic, hybrid or volume lash set, applied lash by lash for a comfortable, natural finish.',
    includes: ['Lash style consultation', 'Classic, hybrid or volume set', 'Aftercare guidance'],
    startingPrice: null,
    duration: 'Approx. 90–120 min (to be confirmed)',
    image: images.lashes,
    personnel: team('lash', 'Lash Technician'),
    whatsapp: '2340000000013',
  },
  {
    slug: 'nail-services',
    name: 'Nail Services',
    category: 'Nails',
    shortDescription: 'Acrylics, gel extensions, nail art and refills.',
    description:
      'From almond acrylics to intricate chrome nail art, our nail services cover extensions, refills, repairs and removals.',
    includes: ['Acrylic or gel extensions', 'Custom nail art', 'Refills and repairs', 'Safe removal'],
    startingPrice: null,
    duration: 'Approx. 60–120 min (to be confirmed)',
    image: images.nails,
    personnel: team('nail', 'Nail Artist'),
    whatsapp: '2340000000014',
  },
  {
    slug: 'braiding',
    name: 'Braiding',
    category: 'Hair',
    shortDescription: 'Knotless braids, cornrows, twists and boho styles.',
    description:
      'Neat, lasting protective styles: knotless braids, boho braids, cornrows and twists, installed with care for your edges and scalp.',
    includes: ['Style consultation', 'Hair preparation', 'Braiding installation', 'Finishing and styling'],
    startingPrice: null,
    duration: 'Varies by style (to be confirmed)',
    image: images.braids,
    personnel: team('braid', 'Braider'),
    whatsapp: '2340000000015',
  },
  {
    slug: 'hair-treatment',
    name: 'Hair Treatment',
    category: 'Hair',
    shortDescription: 'Deep conditioning and repair for healthy, strong hair.',
    description:
      'Restore moisture and strength with treatments selected for your hair type, from protein repair to deep hydration and scalp care.',
    includes: ['Hair and scalp assessment', 'Cleanse', 'Targeted treatment', 'Steam and finish'],
    startingPrice: null,
    duration: 'Approx. 60 min (to be confirmed)',
    image: images.haircare,
    personnel: team('treat', 'Hair Stylist'),
    whatsapp: '2340000000016',
  },
  {
    slug: 'barbing',
    name: 'Barbing',
    category: 'Grooming',
    shortDescription: 'Clean cuts, fades, line-ups and beard grooming.',
    description: 'Sharp, precise cuts in a relaxed setting: fades, tapers, line-ups and beard shaping.',
    includes: ['Consultation', 'Haircut or fade', 'Line-up', 'Beard grooming (optional)'],
    startingPrice: null,
    duration: 'Approx. 30–45 min (to be confirmed)',
    image: images.barbing,
    personnel: team('barb', 'Barber'),
    whatsapp: '2340000000017',
  },
  {
    slug: 'wig-installation',
    name: 'Wig Installation',
    category: 'Wigs',
    shortDescription: 'Flawless frontal and closure installs that melt.',
    description:
      'Our stylists customise, bleach, pluck and install your unit for an undetectable hairline, then style it to your preference.',
    includes: ['Lace customisation', 'Hairline plucking', 'Glued or glueless install', 'Styling'],
    startingPrice: null,
    duration: 'Approx. 90–120 min (to be confirmed)',
    image: images.bodyWaveWig,
    personnel: team('install', 'Wig Specialist'),
    whatsapp: '2340000000018',
  },
  {
    slug: 'wig-revamping',
    name: 'Wig Revamping',
    category: 'Wigs',
    shortDescription: 'Bring tired units back to life.',
    description: 'A deep wash, treatment and restyle that restores softness, shine and pattern to well-loved wigs.',
    includes: ['Deep wash and detangle', 'Conditioning treatment', 'Lace refresh', 'Restyle'],
    startingPrice: null,
    duration: 'Turnaround to be confirmed',
    image: images.curlyWig,
    personnel: team('revamp', 'Wig Specialist'),
    whatsapp: '2340000000019',
  },
  {
    slug: 'wig-maintenance',
    name: 'Wig Maintenance',
    category: 'Wigs',
    shortDescription: 'Regular care to keep your unit looking new.',
    description: 'Scheduled washing, conditioning and styling to extend the life of your unit between revamps.',
    includes: ['Wash and condition', 'Detangle', 'Style refresh'],
    startingPrice: null,
    duration: 'Turnaround to be confirmed',
    image: images.boneStraight,
    personnel: team('maint', 'Wig Specialist'),
    whatsapp: '2340000000020',
  },
];

export function findService(slug?: string | null): SalonService | undefined {
  return salonServices.find((s) => s.slug === slug);
}
