'use client'

import React from 'react'
import type { Apontamento } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ApontamentosTableProps {
  apontamentos: Apontamento[]
  onAprovar?: (id: string) => void
  onRejeitar?: (id: string) => void
  showActions?: boolean
  onViewFotos?: (fotos: string[]) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '--:--'
  return timeStr.slice(0, 5)
}

function formatTotalHoras(total: number | null): string {
  if (total === null || total === undefined) return '--:--'
  const hours = Math.floor(total)
  const minutes = Math.round((total - hours) * 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getTipoHoraLabel(tipo: string): string {
  switch (tipo) {
    case 'normal':
      return 'Normal'
    case 'extra_50':
      return 'Extra 50%'
    case 'extra_100':
      return 'Extra 100%'
    default:
      return tipo
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pendente':
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
          Pendente
        </Badge>
      )
    case 'aprovado':
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
          Aprovado
        </Badge>
      )
    case 'rejeitado':
      return (
        <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">
          Rejeitado
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getTipoHoraBadge(tipo: string) {
  switch (tipo) {
    case 'extra_50':
      return (
        <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
          {getTipoHoraLabel(tipo)}
        </Badge>
      )
    case 'extra_100':
      return (
        <Badge className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-50">
          {getTipoHoraLabel(tipo)}
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="text-gray-text">
          {getTipoHoraLabel(tipo)}
        </Badge>
      )
  }
}

export function ApontamentosTable({
  apontamentos,
  onAprovar,
  onRejeitar,
  showActions = true,
  onViewFotos,
}: ApontamentosTableProps) {
  return (
    <div className="rounded-lg border border-gray-border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-border hover:bg-transparent">
            <TableHead className="text-gray-muted">Tecnico</TableHead>
            <TableHead className="text-gray-muted">Obra</TableHead>
            <TableHead className="text-gray-muted">Servico</TableHead>
            <TableHead className="text-gray-muted">Data</TableHead>
            <TableHead className="text-gray-muted">Entrada</TableHead>
            <TableHead className="text-gray-muted">Saida</TableHead>
            <TableHead className="text-gray-muted">Total</TableHead>
            <TableHead className="text-gray-muted">Tipo Hora</TableHead>
            <TableHead className="text-gray-muted">Status</TableHead>
            {showActions && (
              <TableHead className="text-right text-gray-muted">
                Acoes
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {apontamentos.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showActions ? 10 : 9}
                className="py-8 text-center text-gray-muted"
              >
                Nenhum apontamento encontrado.
              </TableCell>
            </TableRow>
          ) : (
            apontamentos.map((apt) => (
              <TableRow key={apt.id} className="border-gray-border">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      {apt.tecnico?.avatar_url ? (
                        <AvatarImage
                          src={apt.tecnico.avatar_url}
                          alt={apt.tecnico.full_name}
                        />
                      ) : null}
                      <AvatarFallback className="bg-accent-blue/10 text-[10px] text-accent-blue">
                        {apt.tecnico
                          ? getInitials(apt.tecnico.full_name)
                          : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-navy">
                      {apt.tecnico?.full_name || 'N/A'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-text">
                  {apt.obra?.nome || 'N/A'}
                </TableCell>
                <TableCell className="text-sm text-gray-text">
                  {apt.tipo_servico}
                </TableCell>
                <TableCell className="text-sm text-gray-text">
                  {formatDate(apt.data_apontamento)}
                </TableCell>
                <TableCell className="font-mono text-sm text-gray-text">
                  {formatTime(apt.hora_entrada)}
                </TableCell>
                <TableCell className="font-mono text-sm text-gray-text">
                  {formatTime(apt.hora_saida)}
                </TableCell>
                <TableCell className="font-mono text-sm font-medium text-navy">
                  {formatTotalHoras(apt.total_horas)}
                </TableCell>
                <TableCell>{getTipoHoraBadge(apt.tipo_hora)}</TableCell>
                <TableCell>{getStatusBadge(apt.status)}</TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    {apt.status === 'pendente' && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => onAprovar?.(apt.id)}
                          title="Aprovar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          Aprovar
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => onRejeitar?.(apt.id)}
                          title="Rejeitar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
