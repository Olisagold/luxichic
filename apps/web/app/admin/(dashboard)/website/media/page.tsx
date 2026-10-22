import type { Metadata } from 'next';
import { AdminContentProvider } from '@/components/admin/AdminContentProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { contentFor } from '@/lib/content/admin-queries';
import { MediaLibrary } from '@/views/admin/website/MediaLibrary';

export const metadata: Metadata = { title: 'Media library | Admin' };

export default async function AdminMediaLibraryPage() {
  const data = await contentFor('content.media');
  return (
    <RequirePermission permission="content.media">
      {data && (
        <AdminContentProvider value={data}>
          <MediaLibrary />
        </AdminContentProvider>
      )}
    </RequirePermission>
  );
}
