import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { AboutContent } from '@/views/admin/website/AboutContent';

export const metadata: Metadata = { title: 'About page — Admin' };

export default function AdminAboutContentPage() {
  return (
    <RequirePermission permission="content.pages">
      <AboutContent />
    </RequirePermission>);

}
