import { categoryPage } from '@/lib/storefront/pages';

const page = categoryPage('hairs');

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
