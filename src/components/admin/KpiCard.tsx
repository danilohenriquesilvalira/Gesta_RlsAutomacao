'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface KpiCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ReactNode
  color?: string
}

export function KpiCard({
  title,
  value,
  description,
  icon,
  color = 'bg-accent-blue/10 text-accent-blue',
}: KpiCardProps) {
  return (
    <Card className="gap-0 border-gray-border py-0 shadow-sm">
      <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-5">
        <div
          className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full ${color}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-muted truncate">{title}</p>
          <p className="mt-0.5 text-lg sm:text-2xl font-bold text-navy">{value}</p>
          {description && (
            <p className="mt-0.5 text-[10px] sm:text-xs text-gray-muted">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
