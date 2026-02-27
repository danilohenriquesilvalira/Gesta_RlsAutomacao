'use client'

import React from 'react'
import type { Obra } from '@/types'
import { Progress } from '@/components/ui/progress'

interface ObrasGridProps {
  obras: Obra[]
  onEdit?: (obra: Obra) => void
  onDelete?: (id: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  ativa: 'Ativa',
  pausada: 'Pausada',
  concluida: 'Concluída',
}

const STATUS_BADGE: Record<string, string> = {
  ativa: 'bg-emerald-100 text-emerald-700',
  pausada: 'bg-amber-100 text-amber-700',
  concluida: 'bg-gray-100 text-gray-500',
}

const STATUS_BAR: Record<string, string> = {
  ativa: 'bg-success',
  pausada: 'bg-warning',
  concluida: 'bg-gray-muted',
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
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const IcoEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
)
const IcoTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
)
const IcoCal = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
  </svg>
)
const IcoEuro = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M4 10h12" /><path d="M4 14h9" /><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2" />
  </svg>
)

export function ObrasGrid({ obras, onEdit, onDelete }: ObrasGridProps) {
  if (obras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-border bg-white py-16 text-center">
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
          Adicione uma nova obra para começar.
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

        // Cor da barra lateral: overdue > urgente > status
        const barClass = isOverdue
          ? 'bg-error'
          : isUrgent
          ? 'bg-warning'
          : STATUS_BAR[obra.status] ?? 'bg-gray-muted'

        return (
          <div
            key={obra.id}
            className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Barra de accent à esquerda */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${barClass}`} />

            <div className="pl-5 pr-4 pt-4 pb-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black text-accent-blue tracking-widest uppercase">
                    {obra.codigo}
                  </span>
                  <h3 className="mt-0.5 font-semibold text-navy text-[15px] leading-snug truncate">
                    {obra.nome}
                  </h3>
                  <p className="text-xs text-gray-muted truncate mt-0.5">{obra.cliente}</p>
                </div>
                <span className={`shrink-0 mt-0.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${STATUS_BADGE[obra.status]}`}>
                  {STATUS_LABELS[obra.status]}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-border/70 mb-3" />

              {/* Progresso */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-[10px] text-gray-muted">
                  <span>Progresso</span>
                  <span className="font-semibold text-navy">{obra.progresso}%</span>
                </div>
                <Progress
                  value={obra.progresso}
                  className={`h-1.5 ${
                    obra.progresso === 100
                      ? '[&>[data-slot=progress-indicator]]:bg-success'
                      : '[&>[data-slot=progress-indicator]]:bg-accent-blue'
                  }`}
                />
              </div>

              {/* Prazo */}
              {obra.prazo && (
                <div className={`flex items-center gap-1.5 text-xs mb-2 ${
                  isOverdue ? 'text-error' : isUrgent ? 'text-warning' : 'text-gray-muted'
                }`}>
                  <IcoCal />
                  <span className="font-medium">
                    {formatPrazo(obra.prazo)}
                    {isOverdue && ` — ${Math.abs(daysLeft!)} dias em atraso`}
                    {isUrgent && ` — ${daysLeft} dias restantes`}
                  </span>
                </div>
              )}

              {/* Orçamento */}
              {obra.orcamento != null && (
                <div className="flex items-center gap-1.5 text-xs mb-3 text-gray-muted">
                  <IcoEuro />
                  <span className="font-medium">
                    {Number(obra.orcamento).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              )}

              {/* Acções */}
              {(onEdit || onDelete) && (
                <div className="border-t border-gray-border/70 pt-2.5 flex gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(obra)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-border py-1.5 text-xs font-semibold text-gray-text hover:border-navy hover:text-navy transition-colors"
                    >
                      <IcoEdit /> Editar
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(obra.id)}
                      className="flex items-center justify-center w-9 rounded-lg border border-error/25 text-error hover:bg-error/5 transition-colors"
                      title="Eliminar obra"
                    >
                      <IcoTrash />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
