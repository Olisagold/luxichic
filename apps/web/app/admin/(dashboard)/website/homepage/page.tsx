import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { HomepageContent } from '@/views/admin/website/HomepageContent';

export const metadata: Metadata = { title: 'Homepage content — Admin' };

export default function AdminHomepageContentPage() {
  return (
    <RequirePermission permission="content.homepage">
      <HomepageContent />
    </RequirePermission>);

}
