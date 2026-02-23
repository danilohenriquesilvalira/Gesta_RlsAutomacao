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
                <p className="ml-3 text-gray-muted text-sm">Carregando...</p>
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
                    onLogout={signOut}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((c) => !c)}
                />
            )}

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
                {/* Mobile top bar */}
                <header className="sticky top-0 z-30 flex items-center gap-2 bg-white border-b border-gray-border px-4 h-14 lg:hidden">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-navy">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <span className="text-base font-bold text-navy">FieldSync</span>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
                    {!isAdmin && (
                        <OfflineBanner
                            isOnline={isOnline}
                            pendingCount={pendingCount}
                            isSyncing={isSyncing}
                            onSync={sync}
                        />
                    )}
                    <Outlet />
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
