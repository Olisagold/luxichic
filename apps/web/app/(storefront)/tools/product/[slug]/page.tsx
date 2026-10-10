import { productPage } from '@/lib/storefront/pages';

const page = productPage('tools');

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
