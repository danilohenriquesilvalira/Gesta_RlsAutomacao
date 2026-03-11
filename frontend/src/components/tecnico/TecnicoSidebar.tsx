'use client'

import React from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard, ClipboardList, Building2, Wallet,
  User, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react'

interface TecnicoSidebarProps {
  currentPath: string
  userName: string
  avatarUrl?: string | null
  onLogout: () => void
  collapsed: boolean
  onToggle: () => void
}

const navSections = [
  {
    title: 'Menu',
    links: [
      { label: 'Dashboard', path: '/meu-dashboard', icon: <LayoutDashboard size={16} /> },
      { label: 'Apontamentos', path: '/meus-apontamentos', icon: <ClipboardList size={16} /> },
      { label: 'Obras', path: '/minhas-obras', icon: <Building2 size={16} /> },
      { label: 'Despesas', path: '/minhas-despesas', icon: <Wallet size={16} /> },
    ],
  },
  {
    title: 'Conta',
    links: [
      { label: 'Perfil', path: '/perfil', icon: <User size={16} /> },
    ],
  },
]

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function TecnicoSidebar({
  currentPath,
  userName,
  avatarUrl,
  onLogout,
  collapsed,
  onToggle,
}: TecnicoSidebarProps) {
  const firstName = userName.split(' ')[0]

  return (
    <aside
      className={`hidden lg:flex sticky top-0 h-screen flex-col border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'
        }`}
      style={{ backgroundColor: '#F6F4F5' }}
    >
      {/* ── Perfil do utilizador ── */}
      <div className={`flex flex-col items-center border-b border-gray-200 shrink-0 relative ${collapsed ? 'py-5 px-2' : 'pt-8 pb-6 px-4'}`}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-navy/15 to-transparent" />
        <div className={`shrink-0 transition-all duration-300 rounded-full
          ${collapsed ? 'h-9 w-9' : 'h-16 w-16'}
          ${avatarUrl
            ? 'ring-2 ring-navy/25 ring-offset-2 ring-offset-[#F6F4F5] shadow-md overflow-hidden'
            : 'ring-2 ring-navy/15 ring-offset-2 ring-offset-[#F6F4F5] bg-navy flex items-center justify-center shadow-sm'
          }`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="w-full h-full object-cover object-center rounded-full"
            />
          ) : (
            <span className={`font-bold text-white select-none ${collapsed ? 'text-[10px]' : 'text-base'}`}>
              {getInitials(userName)}
            </span>
          )}
        </div>
        {!collapsed && (
          <div className="text-center mt-4">
            <p className="text-[14px] font-bold text-navy leading-tight">{firstName}</p>
            <p className="text-[11px] text-gray-400 font-medium mt-1">Técnico</p>
          </div>
        )}
      </div>

      {/* ── Navegação ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const isActive =
                  currentPath === link.path ||
                  (link.path !== '/meu-dashboard' && currentPath.startsWith(link.path))
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    title={collapsed ? link.label : undefined}
                    className={`group flex items-center rounded-xl transition-all duration-150 relative overflow-hidden ${collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 h-11'
                      } ${isActive
                        ? 'bg-white text-navy shadow-sm shadow-navy/[0.06] border border-navy/[0.12]'
                        : 'text-gray-500 hover:bg-white/80 hover:text-gray-800'
                      }`}
                  >
                    {isActive && !collapsed && (
                      <span className="absolute left-0 inset-y-[7px] w-[2.5px] rounded-r-full bg-navy/40" />
                    )}
                    <span className={`shrink-0 transition-colors ${isActive ? 'text-navy' : 'text-gray-400 group-hover:text-gray-600'}`}>
                      {link.icon}
                    </span>
                    {!collapsed && (
                      <span className={`text-[13px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        {link.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Toggle colapso ── */}
      <div className="px-3 py-2 border-t border-gray-200 shrink-0">
        <button
          onClick={onToggle}
          className={`flex items-center rounded-xl h-9 w-full transition-colors text-gray-400 hover:bg-gray-100 hover:text-gray-600 ${collapsed ? 'justify-center' : 'px-3 gap-2.5'
            }`}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          {!collapsed && <span className="text-[12px] font-medium">Ocultar menu</span>}
        </button>
      </div>

      {/* ── Terminar sessão ── */}
      <div className="px-3 pb-4 shrink-0">
        <button
          onClick={onLogout}
          title="Terminar sessão"
          className={`flex items-center rounded-xl h-10 w-full transition-colors text-gray-400 hover:bg-red-50 hover:text-red-500 ${collapsed ? 'justify-center' : 'px-3 gap-2.5'
            }`}
        >
          <LogOut size={15} />
          {!collapsed && <span className="text-[13px] font-medium">Terminar sessão</span>}
        </button>
      </div>
    </aside>
  )
}
