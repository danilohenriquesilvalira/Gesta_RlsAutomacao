'use client'

import { cn } from '@/lib/utils'
import type { ApontamentoStatus, TipoHora } from '@/types'

interface EntryCardApontamento {
  id: string
  obra_codigo: string
  obra_nome: string
  tipo_servico: string
  hora_entrada: string
  hora_saida: string | null
  total_horas: number | null
  tipo_hora: TipoHora
  status: ApontamentoStatus
  fotos_count: number
}

interface EntryCardProps {
  apontamento: EntryCardApontamento
  onEdit?: () => void
  onDelete?: () => void
}

const statusConfig: Record<
  ApontamentoStatus,
  { label: string; bar: string; badge: string }
> = {
  pendente: {
    label: 'Pendente',
    bar: 'bg-warning',
    badge: 'bg-warning/10 text-warning border border-warning/20',
  },
  aprovado: {
    label: 'Aprovado',
    bar: 'bg-success',
    badge: 'bg-success/10 text-success border border-success/20',
  },
  rejeitado: {
    label: 'Rejeitado',
    bar: 'bg-error',
    badge: 'bg-error/10 text-error border border-error/20',
  },
}

const tipoHoraLabels: Record<TipoHora, string> = {
  normal: 'Hora Normal',
  extra_50: 'Extra 50%',
  extra_100: 'Extra 100%',
}

function formatHoras(total: number | null): string {
  if (total === null) return '--'
  const h = Math.floor(total)
  const m = Math.round((total - h) * 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

const IcoClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-muted shrink-0">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const IcoTag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-muted shrink-0">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
)
const IcoPhoto = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-muted shrink-0">
    <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
)
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

export function EntryCard({ apontamento, onEdit, onDelete }: EntryCardProps) {
  const status = statusConfig[apontamento.status]
  const canAct = apontamento.status === 'pendente' && (onEdit || onDelete)

  return (
    <div className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Barra de accent à esquerda */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', status.bar)} />

      <div className="pl-5 pr-4 pt-4 pb-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap min-w-0">
              {apontamento.obra_codigo ? (
                <>
                  <span className="text-[10px] font-black text-accent-blue tracking-widest uppercase shrink-0">
                    {apontamento.obra_codigo}
                  </span>
                  <span className="text-gray-border text-[10px] shrink-0">·</span>
                  <span className="text-sm font-semibold text-navy truncate">
                    {apontamento.obra_nome}
                  </span>
                </>
              ) : (
                <span className="text-sm font-semibold text-navy">Oficina</span>
              )}
            </div>
            <p className="text-xs text-gray-muted truncate">{apontamento.tipo_servico}</p>
          </div>
          <span className={cn('shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold', status.badge)}>
            {status.label}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-border/70 mb-3" />

        {/* Info grid 2 colunas */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-text">
            <IcoClock />
            <span className="truncate">
              {apontamento.hora_entrada}
              {apontamento.hora_saida ? ` → ${apontamento.hora_saida}` : ' → ...'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
            <IcoClock />
            {formatHoras(apontamento.total_horas)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-muted">
            <IcoTag />
            <span className="truncate">{tipoHoraLabels[apontamento.tipo_hora]}</span>
          </div>
          {apontamento.fotos_count > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-muted">
              <IcoPhoto />
              {apontamento.fotos_count} foto{apontamento.fotos_count !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Botões de acção */}
        {canAct && (
          <div className="border-t border-gray-border/70 mt-3 pt-2.5 flex gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-border py-1.5 text-xs font-semibold text-gray-text hover:border-navy hover:text-navy transition-colors"
              >
                <IcoEdit /> Editar
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-error/25 py-1.5 text-xs font-semibold text-error hover:bg-error/5 transition-colors"
              >
                <IcoTrash /> Eliminar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
