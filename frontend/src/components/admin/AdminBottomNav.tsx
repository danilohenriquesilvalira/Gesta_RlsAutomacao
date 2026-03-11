'use client'

import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface AdminBottomNavProps {
  currentPath: string
}

const tabs = [
  {
    label: 'Painel',
    href: '/dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Apontar',
    href: '/apontamentos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
      </svg>
    ),
  },
  {
    label: 'Funcionários',
    href: '/tecnicos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Despesas',
    href: '/despesas',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Relatórios',
    href: '/relatorios',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M8 18v-2" /><path d="M12 18v-4" /><path d="M16 18v-6" />
      </svg>
    ),
  },
]

export function AdminBottomNav({ currentPath }: AdminBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-border/50 bg-white/90 backdrop-blur-xl lg:hidden">
      <div className="flex h-14 items-center justify-around px-0">
        {tabs.map((tab) => {
          const isActive =
            currentPath === tab.href ||
            (tab.href !== '/dashboard' && currentPath.startsWith(tab.href))

          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 relative',
                isActive ? 'text-accent-blue' : 'text-gray-muted'
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-accent-blue" />
              )}
              <span className="shrink-0">{tab.icon}</span>
              <span className="text-[8px] font-medium leading-none">
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
