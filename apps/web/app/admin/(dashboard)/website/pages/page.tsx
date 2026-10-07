import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { PagesContent } from '@/views/admin/website/PagesContent';

export const metadata: Metadata = { title: 'Pages — Admin' };

export default function AdminPagesContentPage() {
  return (
    <RequirePermission permission="content.pages">
      <PagesContent />
    </RequirePermission>);

}
