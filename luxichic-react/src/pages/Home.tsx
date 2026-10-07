import React from 'react';
import { HeroSection } from '../components/home/HeroSection';
import { IntroSection } from '../components/home/IntroSection';
import { DivisionCards } from '../components/home/DivisionCards';
import { FeaturedCollections } from '../components/home/FeaturedCollections';
import { ToolsShowcase } from '../components/home/ToolsShowcase';
import { SalonServicesSection } from '../components/home/SalonServicesSection';
import { WhyChoose } from '../components/home/WhyChoose';
import { TestimonialCarousel } from '../components/home/TestimonialCarousel';
import { InstagramGallery } from '../components/home/InstagramGallery';
import { NewsletterSection } from '../components/home/NewsletterSection';
import { ProductRail } from '../components/store/ProductRail';
import { hairProducts } from '../data/hairProducts';
import { siteContent } from '../data/content';
import { useDb } from '../services/db';

/** Homepage sections are ordered and toggled from Admin → Website → Homepage. */
export function Home() {
  const featuredIds = useDb((s) => s.content.featuredProductIds);
  const featured = featuredIds.map((id) => hairProducts.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  const bestsellers = featured.length ?
  featured :
  hairProducts.filter((p) => p.isBestseller).sort((a, b) => a.featuredRank - b.featuredRank);

  const blocks: Record<string, React.ReactNode> = {
    hero: <HeroSection />,
    intro: <IntroSection />,
    divisions: <DivisionCards />,
    collections: <FeaturedCollections />,
    hairs:
    <ProductRail
      title={<>Bestselling <span className="italic text-pink-deep">Hair</span></>}
      text="The units our customers reorder again and again. Sample prices shown until final pricing is confirmed."
      products={bestsellers}
      action={{ label: 'View all hair products', to: '/hairs/shop/all' }} />,


    tools: <ToolsShowcase />,
    salon: <SalonServicesSection />,
    why: <WhyChoose />,
    testimonials: <TestimonialCarousel />,
    instagram: <InstagramGallery />,
    newsletter: <NewsletterSection />
  };

  return (
    <>
      {siteContent.sections.map((id) => blocks[id] ? <React.Fragment key={id}>{blocks[id]}</React.Fragment> : null)}
    </>);

}