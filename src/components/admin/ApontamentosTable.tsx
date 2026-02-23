'use client';

import React from 'react';
import type { Apontamento } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X } from 'lucide-react';

interface ApontamentosTableProps {
  apontamentos: Apontamento[];
  onAprovar?: (id: string) => void;
  onRejeitar?: (id: string) => void;
  showActions?: boolean;
  onViewFotos?: (fotos: string[]) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '--:--';
  return timeStr.slice(0, 5);
}

function formatTotalHoras(total: number | null): string {
  if (total === null || total === undefined) return '--:--';
  const hours = Math.floor(total);
  const minutes = Math.round((total - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getTipoHoraLabel(tipo: string): string {
  switch (tipo) {
    case 'normal': return 'Normal';
    case 'extra_50': return '50%';
    case 'extra_100': return '100%';
    default: return tipo;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pendente':
      return <Badge className="border-amber-200 bg-amber-50 text-amber-700 font-bold text-[10px]">Pendente</Badge>;
    case 'aprovado':
      return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-[10px]">Aprovado</Badge>;
    case 'rejeitado':
      return <Badge className="border-red-200 bg-red-50 text-red-700 font-bold text-[10px]">Rejeitado</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

function getTipoHoraBadge(tipo: string) {
  const label = getTipoHoraLabel(tipo);
  switch (tipo) {
    case 'extra_50':
      return <Badge className="border-blue-200 bg-blue-50 text-blue-700 font-bold text-[10px]">{label}</Badge>;
    case 'extra_100':
      return <Badge className="border-purple-200 bg-purple-50 text-purple-700 font-bold text-[10px]">{label}</Badge>;
    default:
      return <Badge variant="secondary" className="text-gray-text font-bold text-[10px]">{label}</Badge>;
  }
}

export function ApontamentosTable({
  apontamentos,
  onAprovar,
  onRejeitar,
  showActions = true,
}: ApontamentosTableProps) {
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-border hover:bg-transparent bg-gray-50/50">
            <TableHead className="text-gray-muted pl-6 h-10">Técnico</TableHead>
            <TableHead className="text-gray-muted text-center h-10">Obra</TableHead>
            <TableHead className="text-gray-muted text-center h-10">Serviço</TableHead>
            <TableHead className="text-gray-muted text-center h-10">Data</TableHead>
            <TableHead className="text-gray-muted text-center h-10">Período</TableHead>
            <TableHead className="text-gray-muted text-center h-10">Total</TableHead>
            <TableHead className="text-gray-muted text-center h-10">Tipo</TableHead>
            <TableHead className="text-gray-muted text-center h-10">Status</TableHead>
            {showActions && <TableHead className="text-right pr-6 h-10">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {apontamentos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 10 : 9} className="py-10 text-center text-gray-muted">
                Nenhum apontamento encontrado.
              </TableCell>
            </TableRow>
          ) : (
            apontamentos.map((apt) => (
              <TableRow key={apt.id} className="border-gray-border hover:bg-gray-50/50 transition-colors">
                <TableCell className="pl-6 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {apt.tecnico?.avatar_url ? (
                        <AvatarImage src={apt.tecnico.avatar_url} alt={apt.tecnico.full_name} />
                      ) : null}
                      <AvatarFallback className="bg-accent-blue/10 text-[9px] text-accent-blue font-bold">
                        {apt.tecnico ? getInitials(apt.tecnico.full_name) : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-bold text-navy truncate max-w-[120px]">
                      {apt.tecnico?.full_name || 'N/A'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-center text-gray-text px-2 max-w-[120px] truncate">
                  {apt.obra?.nome || 'N/A'}
                </TableCell>
                <TableCell className="text-sm text-center text-gray-text px-2 truncate max-w-[100px]">
                  {apt.tipo_servico}
                </TableCell>
                <TableCell className="text-sm text-center text-gray-text px-2">
                  {formatDate(apt.data_apontamento)}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-center text-gray-text px-2">
                  {formatTime(apt.hora_entrada)} - {formatTime(apt.hora_saida)}
                </TableCell>
                <TableCell className="font-mono text-sm font-bold text-navy text-center px-2">
                  {formatTotalHoras(apt.total_horas)}
                </TableCell>
                <TableCell className="text-center px-2">{getTipoHoraBadge(apt.tipo_hora)}</TableCell>
                <TableCell className="text-center px-2">{getStatusBadge(apt.status)}</TableCell>
                {showActions && (
                  <TableCell className="text-right pr-6 py-2">
                    {apt.status === 'pendente' && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 rounded-full"
                          onClick={() => onAprovar?.(apt.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:bg-red-50 rounded-full"
                          onClick={() => onRejeitar?.(apt.id)}
                        >
                          <X className="h-4 w-4" />
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
  );
}
