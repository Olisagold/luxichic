import type { Category } from '@/types/product';
import { images } from '@/data/images';

/**
 * Category registry. Add a new entry here (and tag products with its slug)
 * to create a new browsable category — no other code changes required.
 * `all`, `new-arrivals`, `bestsellers` and `discounted` are computed collections.
 */
export const hairCategories: Category[] = [
{ slug: 'all', name: 'All Hair Products', group: 'Shop', description: 'Every wig, bundle, frontal, closure and accessory in the LUXICHIC Hairs boutique.', image: images.heroModel },
{ slug: 'new-arrivals', name: 'New Arrivals', group: 'Shop', description: 'The latest units and textures to arrive at LUXICHIC Hairs.', image: images.kinkyStraight },
{ slug: 'bestsellers', name: 'Bestsellers', group: 'Shop', description: 'The pieces our customers love and reorder most.', image: images.bodyWaveWig },
{ slug: 'discounted', name: 'Sale', group: 'Shop', description: 'Premium hair at special prices, for a limited time.', image: images.curlyWig },

{ slug: 'closure-wigs', name: 'Closure Wigs', group: 'Wig Construction', description: 'Beginner-friendly wigs with a natural-looking closure parting.', image: images.kinkyStraight },
{ slug: 'frontal-wigs', name: 'Frontal Wigs', group: 'Wig Construction', description: 'Ear-to-ear lace frontals for an undetectable hairline and versatile parting.', image: images.boneStraight },
{ slug: 'full-lace-wigs', name: 'Full Lace Wigs', group: 'Wig Construction', description: 'Fully hand-tied lace caps you can part and style anywhere.', image: images.heroModel },
{ slug: '360-lace-wigs', name: '360 Lace Wigs', group: 'Wig Construction', description: 'Lace all around the perimeter for high ponytails and updos.', image: images.deepWave },
{ slug: 'full-cap-wigs', name: 'Full Cap Wigs', group: 'Wig Construction', description: 'Glueless, easy-wear caps for everyday convenience.', image: images.curlyWig },
{ slug: 'half-cap-wigs', name: 'Half Cap Wigs', group: 'Wig Construction', description: 'Quick, protective half wigs that blend with your leave-out.', image: images.deepWave },

{ slug: 'bone-straight', name: 'Bone Straight', group: 'Hair Textures', description: 'Ultra-sleek, flat-ironed straight hair with a glossy, flowing finish.', image: images.boneStraight },
{ slug: 'silky-straight', name: 'Silky Straight', group: 'Hair Textures', description: 'Soft, smooth straight hair with natural movement.', image: images.boneStraight },
{ slug: 'kinky-straight', name: 'Kinky Straight', group: 'Hair Textures', description: 'A blow-out texture that blends beautifully with natural hair.', image: images.kinkyStraight },
{ slug: 'yaki-straight', name: 'Yaki Straight', group: 'Hair Textures', description: 'The look of freshly relaxed hair, light and full of body.', image: images.heroModel },
{ slug: 'deep-wave', name: 'Deep Wave', group: 'Hair Textures', description: 'Defined, voluminous waves that hold their pattern.', image: images.deepWave },
{ slug: 'body-wave', name: 'Body Wave', group: 'Hair Textures', description: 'Soft S-shaped waves with effortless bounce.', image: images.bodyWaveWig },
{ slug: 'water-wave', name: 'Water Wave', group: 'Hair Textures', description: 'Wet-look ripples with a playful, defined pattern.', image: images.deepWave },
{ slug: 'curly', name: 'Curly Hair', group: 'Hair Textures', description: 'Bouncy spiral and wand curls full of life.', image: images.curlyWig },
{ slug: 'natural', name: 'Natural Hair', group: 'Hair Textures', description: 'Kinky coily textures that celebrate natural hair.', image: images.braids },

{ slug: 'brazilian', name: 'Brazilian Hair', group: 'Hair Types', description: 'Thick, lustrous Brazilian hair that holds curls beautifully.', image: images.bodyWaveWig },
{ slug: 'virgin', name: 'Virgin Hair', group: 'Hair Types', description: 'Unprocessed hair with cuticles intact for longevity.', image: images.boneStraight },
{ slug: 'human-hair', name: 'Human Hair', group: 'Hair Types', description: 'Quality human hair you can heat-style, dye and treat.', image: images.curlyWig },

{ slug: 'wigs', name: 'Wigs', group: 'Products', description: 'Ready-to-wear wigs in every construction and texture.', image: images.bodyWaveWig },
{ slug: 'frontals', name: 'Frontals', group: 'Products', description: 'Pre-plucked lace frontals for custom units.', image: images.bundles },
{ slug: 'closures', name: 'Closures', group: 'Products', description: 'Lace closures in 4x4, 5x5 and 6x6.', image: images.bundles },
{ slug: 'bundles', name: 'Hair Bundles', group: 'Products', description: 'Double-wefted bundles for sew-ins and custom wigs.', image: images.bundles },
{ slug: 'accessories', name: 'Hair Accessories', group: 'Products', description: 'Grip bands, edge kits and finishing essentials.', image: images.wigAccessories }];


export const toolCategories: Category[] = [
{ slug: 'all', name: 'All Products', group: 'Shop', description: 'Every tool, essential and extension in one place.', image: images.stylingTools },
{ slug: 'new-arrivals', name: 'New Arrivals', group: 'Shop', description: 'Fresh arrivals for stylists, wig makers and salons.', image: images.nailLamp },
{ slug: 'bestsellers', name: 'Bestsellers', group: 'Shop', description: 'The tools professionals reorder most.', image: images.hotComb },
{ slug: 'discounted', name: 'Special Offers', group: 'Shop', description: 'Professional quality at special prices.', image: images.hoodDryer },
{ slug: 'accessories', name: 'Accessories', group: 'Shop', description: 'Small essentials that finish every look.', image: images.wigAccessories },

{ slug: 'styling-tools', name: 'Hair Styling Tools', group: 'Departments', description: 'Dryers, straighteners, hot combs, clippers and more.', image: images.stylingTools },
{ slug: 'wig-making', name: 'Wig-Making Tools', group: 'Departments', description: 'Block heads, stands, caps, combs and needles for perfect units.', image: images.canvasHead },
{ slug: 'haircare', name: 'Haircare Products', group: 'Departments', description: 'Oils, serums, masks and treatments for healthy hair and wigs.', image: images.haircare },
{ slug: 'salon-essentials', name: 'Salon Essentials', group: 'Departments', description: 'Equipment and accessories that keep salons running beautifully.', image: images.hoodDryer },
{ slug: 'braiding', name: 'Braiding Extensions', group: 'Departments', description: 'Affordable braiding, attachment and expression hair.', image: images.braidingHair },

{ slug: 'hair-dryers', name: 'Hair Dryers', group: 'Hair Styling Tools', description: 'Fast, frizz-free drying.', image: images.stylingTools },
{ slug: 'straighteners', name: 'Hair Straighteners', group: 'Hair Styling Tools', description: 'Flat irons and pressing tools.', image: images.stylingTools },
{ slug: 'curling-irons', name: 'Curling Irons', group: 'Hair Styling Tools', description: 'Wands and tongs for lasting curls.', image: images.stylingTools },
{ slug: 'hot-combs', name: 'Hot Combs', group: 'Hair Styling Tools', description: 'Electric pressing combs.', image: images.hotComb },
{ slug: 'clippers', name: 'Hair Clippers', group: 'Hair Styling Tools', description: 'Precision clippers for fades and tapers.', image: images.clippers },
{ slug: 'trimmers', name: 'Hair Trimmers', group: 'Hair Styling Tools', description: 'Detailers for crisp line-ups.', image: images.clippers },

{ slug: 'canvas-heads', name: 'Canvas Block Heads', group: 'Wig-Making Tools', description: 'Pin-friendly heads for construction.', image: images.canvasHead },
{ slug: 'mannequin-heads', name: 'Mannequin Heads', group: 'Wig-Making Tools', description: 'For styling practice and display.', image: images.canvasHead },
{ slug: 'wig-stands', name: 'Wig Stands', group: 'Wig-Making Tools', description: 'Tripods and stands.', image: images.canvasHead },
{ slug: 'wig-caps', name: 'Wig Caps', group: 'Wig-Making Tools', description: 'Stocking and mesh caps.', image: images.wigAccessories },
{ slug: 'wig-combs', name: 'Wig Combs', group: 'Wig-Making Tools', description: 'Parting, detangling and edge tools.', image: images.wigAccessories },
{ slug: 'wig-needles', name: 'Wig Needles', group: 'Wig-Making Tools', description: 'Ventilating and sewing needles.', image: images.wigAccessories },
{ slug: 'wig-accessories', name: 'Wig-Making Accessories', group: 'Wig-Making Tools', description: 'Glues, tints, bands and more.', image: images.wigAccessories },

{ slug: 'shampoos', name: 'Shampoos', group: 'Haircare Products', description: 'Gentle cleansing for hair and wigs.', image: images.haircare },
{ slug: 'conditioners', name: 'Conditioners', group: 'Haircare Products', description: 'Softness and slip.', image: images.haircare },
{ slug: 'hair-oils', name: 'Hair Oils', group: 'Haircare Products', description: 'Shine and scalp nourishment.', image: images.haircare },
{ slug: 'hair-serums', name: 'Hair Serums', group: 'Haircare Products', description: 'Frizz control and protection.', image: images.haircare },
{ slug: 'hair-masks', name: 'Hair Masks', group: 'Haircare Products', description: 'Weekly deep treatments.', image: images.haircare },
{ slug: 'hair-treatments', name: 'Hair Treatments', group: 'Haircare Products', description: 'Repair and restore.', image: images.haircare },
{ slug: 'hair-sprays', name: 'Hair Sprays', group: 'Haircare Products', description: 'Hold and finish.', image: images.haircare },
{ slug: 'styling-products', name: 'Styling Products', group: 'Haircare Products', description: 'Mousses, gels and edge control.', image: images.haircare },

{ slug: 'salon-chairs', name: 'Salon Chairs', group: 'Salon Essentials', description: 'Styling and barber chairs.', image: images.salonInterior },
{ slug: 'salon-mirrors', name: 'Salon Mirrors', group: 'Salon Essentials', description: 'Illuminated and station mirrors.', image: images.salonInterior },
{ slug: 'professional-dryers', name: 'Professional Hair Dryers', group: 'Salon Essentials', description: 'Hood and salon-grade dryers.', image: images.hoodDryer },
{ slug: 'salon-equipment', name: 'Salon Equipment', group: 'Salon Essentials', description: 'Lamps, dryers and station equipment.', image: images.nailLamp },
{ slug: 'salon-accessories', name: 'Salon Accessories', group: 'Salon Essentials', description: 'Lighting, capes and station extras.', image: images.ledLamp },

{ slug: 'attachment-hair', name: 'Attachment Hair', group: 'Braiding Extensions', description: 'For knotless braids and twists.', image: images.braidingHair },
{ slug: 'braiding-extensions', name: 'Braiding Extensions', group: 'Braiding Extensions', description: 'Every braid style, every length.', image: images.braidingHair },
{ slug: 'expression-hair', name: 'Expression Hair', group: 'Braiding Extensions', description: 'Soft, affordable classic attachments.', image: images.braidingHair },
{ slug: 'pre-stretched', name: 'Pre-stretched Braiding Hair', group: 'Braiding Extensions', description: 'Ready to braid, no stretching needed.', image: images.braidingHair },
{ slug: 'synthetic-braiding', name: 'Synthetic Braiding Hair', group: 'Braiding Extensions', description: 'Lightweight synthetic fibre.', image: images.braidingHair }];