'use client'

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

interface TecnicoRow {
  id: string
  full_name: string
  avatar_url: string | null
  role: string
  horasNormais: number
  horasExtras: number
  totalHoras: number
  obraAtual: string | null
}

interface TecnicosTableProps {
  tecnicos: TecnicoRow[]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatHoras(h: number): string {
  return `${h.toFixed(1)}h`
}

const MAX_HORAS_SEMANA = 44

export function TecnicosTable({ tecnicos, onSelect }: TecnicosTableProps & { onSelect?: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-gray-border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-border hover:bg-transparent">
            <TableHead className="text-gray-muted">Tecnico</TableHead>
            <TableHead className="text-gray-muted">Obra Atual</TableHead>
            <TableHead className="text-right text-gray-muted">
              Horas Normais
            </TableHead>
            <TableHead className="text-right text-gray-muted">
              Horas Extras
            </TableHead>
            <TableHead className="text-right text-gray-muted">
              Total Horas
            </TableHead>
            <TableHead className="w-[180px] text-gray-muted">
              Progresso
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tecnicos.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-8 text-center text-gray-muted"
              >
                Nenhum tecnico encontrado.
              </TableCell>
            </TableRow>
          ) : (
            tecnicos.map((tec) => {
              const progressValue = Math.min(
                (tec.totalHoras / MAX_HORAS_SEMANA) * 100,
                100
              )
              const isOvertime = tec.totalHoras > MAX_HORAS_SEMANA

              return (
                <TableRow
                  key={tec.id}
                  className="border-gray-border cursor-pointer hover:bg-gray-50"
                  onClick={() => onSelect?.(tec.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="default">
                        {tec.avatar_url ? (
                          <AvatarImage
                            src={tec.avatar_url}
                            alt={tec.full_name}
                          />
                        ) : null}
                        <AvatarFallback className="bg-accent-blue/10 text-xs text-accent-blue">
                          {getInitials(tec.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-navy">
                          {tec.full_name}
                        </p>
                        <p className="text-xs text-gray-muted">Tecnico</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-text">
                    {tec.obraAtual || (
                      <span className="text-gray-muted">Sem obra</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-text">
                    {formatHoras(tec.horasNormais)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <span
                      className={
                        tec.horasExtras > 0
                          ? 'font-medium text-warning'
                          : 'text-gray-text'
                      }
                    >
                      {formatHoras(tec.horasExtras)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-navy">
                    {formatHoras(tec.totalHoras)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-full">
                        <Progress
                          value={progressValue}
                          className={`h-2 ${isOvertime ? '[&>[data-slot=progress-indicator]]:bg-warning' : '[&>[data-slot=progress-indicator]]:bg-accent-blue'}`}
                        />
                      </div>
                      <span
                        className={`min-w-[36px] text-right text-xs font-medium ${isOvertime ? 'text-warning' : 'text-gray-muted'}`}
                      >
                        {Math.round(progressValue)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
