import { categoryPage } from '@/lib/storefront/pages';

const page = categoryPage('tools');

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
