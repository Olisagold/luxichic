import React, { Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { Modal } from '../../ui/Modal';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { AdminCommandSearch } from './AdminCommandSearch';
import { cn } from '../../../utils/cn';

function AdminFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-60 animate-pulse rounded-lg bg-line/70" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />)}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-white" />
    </div>);

}

/** Authenticated admin shell. Production: the server must also reject unauthenticated API calls. */
export function AdminLayout() {
  const { admin } = useAdminAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useLocalStorage('lx_admin_sidebar_collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    document.getElementById('admin-main')?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (!admin) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;

  return (
    <div className="flex min-h-screen w-full bg-canvas font-sans text-charcoal">
      <aside className={cn('sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 ease-lux lg:block', collapsed ? 'w-[68px]' : 'w-60')}>
        <AdminSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      </aside>

      <Modal open={mobileOpen} onClose={() => setMobileOpen(false)} title="Admin navigation" hideTitle side="left" className="max-w-[17rem]">
        <AdminSidebar collapsed={false} mobile onNavigate={() => setMobileOpen(false)} />
      </Modal>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onOpenMobileNav={() => setMobileOpen(true)} onToggleCollapse={() => setCollapsed(!collapsed)} onOpenSearch={() => setSearchOpen(true)} />
        <main id="admin-main" className="mx-auto w-full max-w-[1400px] flex-1 px-3 py-5 sm:px-5 lg:px-8 lg:py-7">
          <Suspense fallback={<AdminFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <AdminCommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: '12px', fontFamily: 'Manrope, sans-serif', border: '1px solid #E9E3DE', fontSize: '13px' } }} />
    </div>);

}