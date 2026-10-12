import type { Metadata } from 'next';
import { AdminContentProvider } from '@/components/admin/AdminContentProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { contentFor } from '@/lib/content/admin-queries';
import { FaqContent } from '@/views/admin/website/FaqContent';

export const metadata: Metadata = { title: 'FAQs — Admin' };

export default async function AdminFaqContentPage() {
  const data = await contentFor('content.pages');
  return (
    <RequirePermission permission="content.pages">
      {data && (
        <AdminContentProvider value={data}>
          <FaqContent />
        </AdminContentProvider>
      )}
    </RequirePermission>
  );
}
