import type { Metadata } from 'next';
import { AdminContentProvider } from '@/components/admin/AdminContentProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { contentFor } from '@/lib/content/admin-queries';
import { AboutContent } from '@/views/admin/website/AboutContent';

export const metadata: Metadata = { title: 'About page — Admin' };

export default async function AdminAboutContentPage() {
  const data = await contentFor('content.pages');
  return (
    <RequirePermission permission="content.pages">
      {data && (
        <AdminContentProvider value={data}>
          <AboutContent />
        </AdminContentProvider>
      )}
    </RequirePermission>
  );
}
