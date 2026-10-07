import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { MediaLibrary } from '@/views/admin/website/MediaLibrary';

export const metadata: Metadata = { title: 'Media library — Admin' };

export default function AdminMediaLibraryPage() {
  return (
    <RequirePermission permission="content.media">
      <MediaLibrary />
    </RequirePermission>
  );
}
