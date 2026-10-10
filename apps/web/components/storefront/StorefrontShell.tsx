import { SiteLayout } from '@/components/layout/SiteLayout';
import { StorefrontProvider } from '@/components/storefront/StorefrontProvider';
import { getStorefrontData } from '@/lib/storefront/data';

/** Header, footer and page chrome, with the catalog and content loaded on the server. */
export async function StorefrontShell({ children }: { children: React.ReactNode }) {
  const data = await getStorefrontData();
  return (
    <StorefrontProvider data={data}>
      <SiteLayout>{children}</SiteLayout>
    </StorefrontProvider>
  );
}
