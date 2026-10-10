import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getStorefrontData } from '@/lib/storefront/data';
import { findCategory, findProduct, findService, productsFor } from '@/lib/storefront/catalog';
import { JsonLd } from '@/lib/seo/JsonLd';
import { absoluteUrl, pageMetadata, summary } from '@/lib/seo/site';
import { divisionLabel } from '@/lib/utils/products';
import { ProductDetail } from '@/views/shop/ProductDetail';
import { ProductListing } from '@/views/shop/ProductListing';
import { ServiceDetail } from '@/views/salon/ServiceDetail';
import { Policy } from '@/views/info/Policy';
import type { Division } from '@/types/product';

/*
 * Page plumbing shared by /hairs and /tools: which pages to build ahead of time, their metadata, and a real 404
 * for unknown slugs. The views themselves are unchanged client components.
 */

type SlugParams = { params: Promise<{ slug: string }> };
type CategoryParams = { params: Promise<{ category: string }> };

export function productPage(division: Division) {
  async function load(slug: string) {
    const product = findProduct(await getStorefrontData(), slug);
    return product?.division === division ? product : undefined;
  }

  return {
    async generateStaticParams() {
      return productsFor(await getStorefrontData(), division).map((p) => ({ slug: p.slug }));
    },
    async generateMetadata({ params }: SlugParams): Promise<Metadata> {
      const product = await load((await params).slug);
      if (!product) return {};
      return pageMetadata({
        title: product.name,
        description: summary(product.shortDescription || product.description),
        path: `/${division}/product/${product.slug}`,
        image: product.images[0],
      });
    },
    async Page({ params }: SlugParams) {
      const product = await load((await params).slug);
      if (!product) notFound();
      const inStock = product.stock > 0;
      return (
        <>
          <JsonLd
            data={{
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              description: product.shortDescription || product.description,
              image: product.images.map(absoluteUrl),
              brand: { '@type': 'Brand', name: product.attributes.brand ?? 'LUXICHIC' },
              category: divisionLabel(division),
              offers: {
                '@type': 'Offer',
                url: absoluteUrl(`/${division}/product/${product.slug}`),
                priceCurrency: 'NGN',
                price: product.price,
                availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              },
            }}
          />
          <ProductDetail division={division} />
        </>
      );
    },
  };
}

export function categoryPage(division: Division) {
  return {
    async generateStaticParams() {
      return (await getStorefrontData()).categories[division].map((c) => ({ category: c.slug }));
    },
    async generateMetadata({ params }: CategoryParams): Promise<Metadata> {
      const category = findCategory(await getStorefrontData(), division, (await params).category);
      if (!category) return {};
      return pageMetadata({
        title: `${category.name} · ${divisionLabel(division)}`,
        description: summary(category.description || `Shop ${category.name} at ${divisionLabel(division)}.`),
        path: `/${division}/shop/${category.slug}`,
        image: category.image || undefined,
      });
    },
    async Page({ params }: CategoryParams) {
      if (!findCategory(await getStorefrontData(), division, (await params).category)) notFound();
      return <ProductListing division={division} />;
    },
  };
}

export const servicePage = {
  async generateStaticParams() {
    return (await getStorefrontData()).services.map((s) => ({ slug: s.slug }));
  },
  async generateMetadata({ params }: SlugParams): Promise<Metadata> {
    const service = findService(await getStorefrontData(), (await params).slug);
    if (!service) return {};
    return pageMetadata({
      title: `${service.name} · Beauty Salon & Spa`,
      description: summary(service.shortDescription || service.description),
      path: `/salon/services/${service.slug}`,
      image: service.image || undefined,
    });
  },
  async Page({ params }: SlugParams) {
    if (!findService(await getStorefrontData(), (await params).slug)) notFound();
    return <ServiceDetail />;
  },
};

export const policyPage = {
  async generateStaticParams() {
    return Object.keys((await getStorefrontData()).content.policies).map((slug) => ({ slug }));
  },
  async generateMetadata({ params }: SlugParams): Promise<Metadata> {
    const slug = (await params).slug;
    const policy = (await getStorefrontData()).content.policies[slug];
    if (!policy) return {};
    return pageMetadata({
      title: policy.title,
      description: summary(policy.sections.map((s) => s.body).join(' ') || policy.title),
      path: `/policies/${slug}`,
    });
  },
  async Page({ params }: SlugParams) {
    if (!(await getStorefrontData()).content.policies[(await params).slug]) notFound();
    return <Policy />;
  },
};
