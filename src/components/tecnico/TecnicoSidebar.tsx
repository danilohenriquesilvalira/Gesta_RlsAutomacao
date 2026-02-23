'use client'

import React from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Home, ListChecks, Building2, Wallet, User, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'

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
    icon: <Home className="w-5 h-5" />,
  },
  {
    label: 'Meus Registos',
    path: '/meus-apontamentos',
    icon: <ListChecks className="w-5 h-5" />,
  },
  {
    label: 'Obras',
    path: '/minhas-obras',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    label: 'Despesas',
    path: '/minhas-despesas',
    icon: <Wallet className="w-5 h-5" />,
  },
  {
    label: 'Perfil',
    path: '/perfil',
    icon: <User className="w-5 h-5" />,
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
        <div className="shrink-0 flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-900/40">
          <span className="text-[11px] font-black text-white tracking-wider">RLS</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-bold text-white tracking-wide">Automação</span>
            <span className="text-[10px] font-medium text-emerald-400 tracking-widest uppercase mt-0.5">Industrial</span>
          </div>
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
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-xs font-medium">Ocultar menu</span>}
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
                title="Terminar sessão"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <button
            onClick={onLogout}
            className="mt-2 flex w-full justify-center rounded-md p-1.5 text-white/40 hover:bg-white/8 hover:text-white transition-colors"
            title="Terminar sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
