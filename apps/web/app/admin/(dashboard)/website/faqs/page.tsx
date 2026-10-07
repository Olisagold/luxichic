import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { FaqContent } from '@/views/admin/website/FaqContent';

export const metadata: Metadata = { title: 'FAQs — Admin' };

export default function AdminFaqContentPage() {
  return (
    <RequirePermission permission="content.pages">
      <FaqContent />
    </RequirePermission>);

}
