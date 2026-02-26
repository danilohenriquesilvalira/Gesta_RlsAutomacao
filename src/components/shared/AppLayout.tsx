'use client';

import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/AdminBottomNav';
import { TecnicoSidebar } from '@/components/tecnico/TecnicoSidebar';
import { BottomNav } from '@/components/tecnico/BottomNav';
import { OfflineBanner } from '@/components/tecnico/OfflineBanner';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useEffect, useState } from 'react';

export default function AppLayout() {
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
                <p className="ml-3 text-gray-muted text-sm">A carregar...</p>
            </div>
        );
    }

    if (!user) return null;

    const isAdmin = profile?.role === 'admin';

    return (
        <div className="min-h-screen flex bg-gray-bg">
            {/* Desktop sidebar */}
            {isAdmin ? (
                <AdminSidebar
                    currentPath={pathname}
                    userName={profile?.full_name ?? 'Admin'}
                    onLogout={signOut}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((c) => !c)}
                />
            ) : (
                <TecnicoSidebar
                    currentPath={pathname}
                    userName={profile?.full_name ?? 'Técnico'}
                    avatarUrl={profile?.avatar_url}
                    onLogout={signOut}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((c) => !c)}
                />
            )}

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0 lg:h-screen lg:overflow-hidden">
                {/* Mobile top bar */}
                <header className="shrink-0 sticky top-0 z-30 flex items-center gap-3 bg-white/90 backdrop-blur-md border-b border-gray-border/60 px-4 h-14 lg:hidden">
                    <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md">
                        <span className="text-[10px] font-black text-white tracking-wider">RLS</span>
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-[13px] font-bold text-navy tracking-wide">Automação</span>
                        <span className="text-[10px] font-medium text-emerald-600 tracking-widest uppercase mt-0.5">Industrial</span>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-3 sm:p-4 lg:p-6 lg:overflow-y-auto lg:overflow-hidden pb-20 lg:pb-6">
                    {!isAdmin && (
                        <OfflineBanner
                            isOnline={isOnline}
                            pendingCount={pendingCount}
                            isSyncing={isSyncing}
                            onSync={sync}
                        />
                    )}
                    <div className="lg:h-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile bottom nav */}
            {isAdmin ? (
                <AdminBottomNav currentPath={pathname} />
            ) : (
                <BottomNav currentPath={pathname} />
            )}
        </div>
    );
}
