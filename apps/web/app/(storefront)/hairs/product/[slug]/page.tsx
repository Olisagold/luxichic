import { productPage } from '@/lib/storefront/pages';

const page = productPage('hairs');

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
