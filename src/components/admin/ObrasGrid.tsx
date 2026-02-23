'use client'

import React from 'react'
import type { Obra } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface ObrasGridProps {
  obras: Obra[]
  onEdit?: (obra: Obra) => void
  onDelete?: (id: string) => void
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ativa':
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
          Ativa
        </Badge>
      )
    case 'pausada':
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
          Pausada
        </Badge>
      )
    case 'concluida':
      return (
        <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
          Concluida
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getDaysUntilPrazo(prazo: string | null): number | null {
  if (!prazo) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const prazoDate = new Date(prazo + 'T00:00:00')
  const diffMs = prazoDate.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function formatPrazo(prazo: string | null): string {
  if (!prazo) return 'Sem prazo'
  const date = new Date(prazo + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ObrasGrid({ obras, onEdit, onDelete }: ObrasGridProps) {
  if (obras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-border bg-white py-16 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8896ae"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
          <path d="M10 6h4" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
          <path d="M10 18h4" />
        </svg>
        <p className="mt-4 text-sm font-medium text-gray-text">
          Nenhuma obra encontrada.
        </p>
        <p className="mt-1 text-xs text-gray-muted">
          Adicione uma nova obra para comecar.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {obras.map((obra) => {
        const daysLeft = getDaysUntilPrazo(obra.prazo)
        const isUrgent = daysLeft !== null && daysLeft < 7 && daysLeft >= 0
        const isOverdue = daysLeft !== null && daysLeft < 0

        return (
          <Card
            key={obra.id}
            className={`gap-0 border py-0 shadow-sm transition-shadow hover:shadow-md ${
              isOverdue
                ? 'border-red-300 bg-red-50/30'
                : isUrgent
                  ? 'border-amber-300 bg-amber-50/30'
                  : 'border-gray-border'
            }`}
          >
            <CardContent className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-navy/10 font-mono text-xs text-navy"
                    >
                      {obra.codigo}
                    </Badge>
                    {getStatusBadge(obra.status)}
                  </div>
                  <h3 className="mt-2 truncate text-base font-semibold text-navy">
                    {obra.nome}
                  </h3>
                  <p className="mt-0.5 truncate text-sm text-gray-muted">
                    {obra.cliente}
                  </p>
                </div>

                {/* Actions */}
                {(onEdit || onDelete) && (
                  <div className="ml-2 flex items-center gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-gray-muted hover:text-navy"
                        onClick={() => onEdit(obra)}
                        title="Editar obra"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                        </svg>
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-gray-muted hover:text-error"
                        onClick={() => onDelete(obra.id)}
                        title="Excluir obra"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-muted">Progresso</span>
                  <span className="text-xs font-semibold text-navy">
                    {obra.progresso}%
                  </span>
                </div>
                <Progress
                  value={obra.progresso}
                  className={`h-2 ${
                    obra.progresso === 100
                      ? '[&>[data-slot=progress-indicator]]:bg-success'
                      : '[&>[data-slot=progress-indicator]]:bg-accent-blue'
                  }`}
                />
              </div>

              {/* Prazo */}
              <div className="mt-4 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : '#8896ae'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <rect width="18" height="18" x="3" y="4" rx="2" />
                  <path d="M3 10h18" />
                </svg>
                <span
                  className={`text-xs font-medium ${
                    isOverdue
                      ? 'text-error'
                      : isUrgent
                        ? 'text-warning'
                        : 'text-gray-muted'
                  }`}
                >
                  {formatPrazo(obra.prazo)}
                  {isOverdue && ` (${Math.abs(daysLeft!)} dias atrasado)`}
                  {isUrgent && ` (${daysLeft} dias restantes)`}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
