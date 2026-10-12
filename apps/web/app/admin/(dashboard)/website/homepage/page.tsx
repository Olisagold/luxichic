import type { Metadata } from 'next';
import { AdminContentProvider } from '@/components/admin/AdminContentProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { contentFor } from '@/lib/content/admin-queries';
import { HomepageContent } from '@/views/admin/website/HomepageContent';

export const metadata: Metadata = { title: 'Homepage content — Admin' };

export default async function AdminHomepageContentPage() {
  const data = await contentFor('content.homepage');
  return (
    <RequirePermission permission="content.homepage">
      {data && (
        <AdminContentProvider value={data}>
          <HomepageContent />
        </AdminContentProvider>
      )}
    </RequirePermission>
  );
}
