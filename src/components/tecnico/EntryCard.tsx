'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
}

const statusConfig: Record<
  ApontamentoStatus,
  { label: string; className: string }
> = {
  pendente: {
    label: 'Pendente',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  aprovado: {
    label: 'Aprovado',
    className: 'bg-success/15 text-success border-success/30',
  },
  rejeitado: {
    label: 'Rejeitado',
    className: 'bg-error/15 text-error border-error/30',
  },
}

const tipoHoraLabels: Record<TipoHora, string> = {
  normal: 'Normal',
  extra_50: 'Extra 50%',
  extra_100: 'Extra 100%',
}

function formatHoras(total: number | null): string {
  if (total === null) return '--:--'
  const h = Math.floor(total)
  const m = Math.round((total - h) * 60)
  return `${h}h${m.toString().padStart(2, '0')}m`
}

export function EntryCard({ apontamento }: EntryCardProps) {
  const status = statusConfig[apontamento.status]

  return (
    <Card className="gap-0 overflow-hidden border-gray-border py-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {/* Top row: obra badge + status */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-accent-blue/10 font-semibold text-accent-blue"
              >
                {apontamento.obra_codigo}
              </Badge>
              <span className="text-sm font-medium text-gray-text">
                {apontamento.obra_nome}
              </span>
            </div>
            <span className="text-sm text-gray-muted">
              {apontamento.tipo_servico}
            </span>
          </div>

          <Badge
            variant="outline"
            className={cn('shrink-0 text-xs font-medium', status.className)}
          >
            {status.label}
          </Badge>
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-gray-border" />

        {/* Bottom row: times, total, tipo_hora, photo count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Clock icon + times */}
            <div className="flex items-center gap-1.5 text-gray-text">
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
                className="text-gray-muted"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-xs font-medium">
                {apontamento.hora_entrada}
                {apontamento.hora_saida
                  ? ` - ${apontamento.hora_saida}`
                  : ' - ...'}
              </span>
            </div>

            {/* Total */}
            <span className="text-xs font-bold text-navy">
              {formatHoras(apontamento.total_horas)}
            </span>

            {/* Tipo hora badge */}
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-medium',
                apontamento.tipo_hora === 'normal'
                  ? 'border-gray-border text-gray-text'
                  : apontamento.tipo_hora === 'extra_50'
                    ? 'border-warning/30 bg-warning/10 text-warning'
                    : 'border-error/30 bg-error/10 text-error'
              )}
            >
              {tipoHoraLabels[apontamento.tipo_hora]}
            </Badge>
          </div>

          {/* Photo thumbnails count */}
          {apontamento.fotos_count > 0 && (
            <div className="flex items-center gap-1 text-gray-muted">
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
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span className="text-xs font-medium">
                {apontamento.fotos_count}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
