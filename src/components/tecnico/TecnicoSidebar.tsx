'use client'

import React from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface TecnicoSidebarProps {
  currentPath: string
  userName: string
  onLogout: () => void
  collapsed: boolean
  onToggle: () => void
}

const navLinks = [
  {
    label: 'Início',
    path: '/inicio',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    label: 'Apontamentos',
    path: '/meus-apontamentos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
      </svg>
    ),
  },
  {
    label: 'Fotos',
    path: '/fotos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
  },
  {
    label: 'Perfil',
    path: '/perfil',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </svg>
    ),
  },
]

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function TecnicoSidebar({
  currentPath,
  userName,
  onLogout,
  collapsed,
  onToggle,
}: TecnicoSidebarProps) {
  return (
    <aside
      className={`hidden lg:flex sticky top-0 h-screen flex-col bg-navy text-white transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-60'
        }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight">FieldSync</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-2 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive =
            currentPath === link.path ||
            (link.path !== '/inicio' && currentPath.startsWith(link.path))
          return (
            <Link
              key={link.path}
              to={link.path}
              title={collapsed ? link.label : undefined}
              className={`group flex items-center rounded-lg transition-all duration-150 ${collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 h-10'
                } ${isActive
                  ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/25'
                  : 'text-white/60 hover:bg-white/8 hover:text-white'
                }`}
            >
              <span className="shrink-0">{link.icon}</span>
              {!collapsed && (
                <span className="text-[13px] font-medium">{link.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-3 py-2">
        <button
          onClick={onToggle}
          className={`flex items-center rounded-lg h-9 w-full transition-colors text-white/40 hover:bg-white/8 hover:text-white ${collapsed ? 'justify-center' : 'px-3 gap-3'
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <path d="m9 18 6-6-6-6" />
              : <path d="m15 18-6-6 6-6" />
            }
          </svg>
          {!collapsed && <span className="text-xs font-medium">Recolher</span>}
        </button>
      </div>

      {/* User */}
      <div className="border-t border-white/10 p-3">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-accent-blue text-[11px] font-bold text-white">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-medium text-white">{userName}</p>
                <p className="text-[11px] text-white/40">Técnico</p>
              </div>
              <button
                onClick={onLogout}
                className="shrink-0 rounded-md p-1.5 text-white/40 hover:bg-white/8 hover:text-white transition-colors"
                title="Sair"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
                </svg>
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <button
            onClick={onLogout}
            className="mt-2 flex w-full justify-center rounded-md p-1.5 text-white/40 hover:bg-white/8 hover:text-white transition-colors"
            title="Sair"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  )
}
