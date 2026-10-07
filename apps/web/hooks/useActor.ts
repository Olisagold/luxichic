import type { AdminUser } from '@/types/admin';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

/** The signed-in admin. Only call inside AdminLayout, which guarantees a session. */
export function useActor(): AdminUser {
  const { admin } = useAdminAuth();
  if (!admin) throw new Error('useActor must be used inside the admin layout');
  return admin;
}