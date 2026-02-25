'use client'

import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ClipboardList, Building2, Wallet, User } from 'lucide-react'

interface BottomNavProps {
  currentPath: string
}

const tabs = [
  {
    label: 'Dashboard',
    href: '/meu-dashboard',
    icon: (active: boolean) => <LayoutDashboard className={cn('w-5 h-5', active ? 'text-accent-blue' : 'text-gray-muted')} />,
  },
  {
    label: 'Apontamentos',
    href: '/meus-apontamentos',
    icon: (active: boolean) => <ClipboardList className={cn('w-5 h-5', active ? 'text-accent-blue' : 'text-gray-muted')} />,
  },
  {
    label: 'Obras',
    href: '/minhas-obras',
    icon: (active: boolean) => <Building2 className={cn('w-5 h-5', active ? 'text-accent-blue' : 'text-gray-muted')} />,
  },
  {
    label: 'Despesas',
    href: '/minhas-despesas',
    icon: (active: boolean) => <Wallet className={cn('w-5 h-5', active ? 'text-accent-blue' : 'text-gray-muted')} />,
  },
  {
    label: 'Perfil',
    href: '/perfil',
    icon: (active: boolean) => <User className={cn('w-5 h-5', active ? 'text-accent-blue' : 'text-gray-muted')} />,
  },
]

export function BottomNav({ currentPath }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-border bg-white lg:hidden">
      <div className="flex h-14 items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            currentPath === tab.href ||
            (tab.href !== '/meu-dashboard' && currentPath.startsWith(tab.href))

          return (
            <Link
              key={tab.href}
              to={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1"
            >
              {tab.icon(isActive)}
              <span className={cn('text-[8px] font-medium leading-none', isActive ? 'text-accent-blue' : 'text-gray-muted')}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
