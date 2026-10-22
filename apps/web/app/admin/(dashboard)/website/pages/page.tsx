import type { Metadata } from 'next';
import { AdminContentProvider } from '@/components/admin/AdminContentProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { contentFor } from '@/lib/content/admin-queries';
import { PagesContent } from '@/views/admin/website/PagesContent';

export const metadata: Metadata = { title: 'Pages | Admin' };

export default async function AdminPagesContentPage() {
  const data = await contentFor('content.pages');
  return (
    <RequirePermission permission="content.pages">
      {data && (
        <AdminContentProvider value={data}>
          <PagesContent />
        </AdminContentProvider>
      )}
    </RequirePermission>
  );
}
