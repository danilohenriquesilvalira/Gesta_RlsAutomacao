'use client';

import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { TecnicoSidebar } from '@/components/tecnico/TecnicoSidebar';
import { BottomNav } from '@/components/tecnico/BottomNav';
import { OfflineBanner } from '@/components/tecnico/OfflineBanner';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useEffect, useState } from 'react';

export default function TecnicoLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { profile, loading, signOut, user } = useAuth();
  const { isOnline, pendingCount, isSyncing, sync } = useOfflineSync();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-bg">
        <div className="w-8 h-8 border-4 border-navy border-t-transparent rounded-full animate-spin" />
        <p className="ml-3 text-gray-muted text-sm font-medium">A carregar...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-bg">
      {/* Desktop sidebar */}
      <TecnicoSidebar
        currentPath={pathname}
        userName={profile?.full_name ?? 'Técnico'}
        onLogout={signOut}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="shrink-0 z-30 flex items-center gap-3 bg-white border-b border-gray-border px-4 h-14 lg:hidden">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md">
            <span className="text-[10px] font-black text-white tracking-wider">RLS</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-bold text-navy tracking-wide">Automação</span>
            <span className="text-[10px] font-medium text-emerald-600 tracking-widest uppercase mt-0.5">Industrial</span>
          </div>
        </header>

        {/* Page content — único container com scroll */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          <OfflineBanner
            isOnline={isOnline}
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            onSync={sync}
          />
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav currentPath={pathname} />
    </div>
  );
}
