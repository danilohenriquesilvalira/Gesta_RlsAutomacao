'use client';

import React from 'react';
import type { Apontamento } from '@/types';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Check, X, Camera, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApontamentosTableProps {
  apontamentos: Apontamento[];
  onAprovar?: (id: string) => void;
  onRejeitar?: (id: string) => void;
  showActions?: boolean;
  onViewFotos?: (fotos: string[]) => void;
  isLoading?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
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
  return `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/80 ${className}`} />;
}

function StatusBadge({ status, nota }: { status: string; nota?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: 'Pendente', cls: 'bg-warning/10 text-warning border-warning/25' },
    aprovado: { label: 'Aprovado', cls: 'bg-success/10 text-success border-success/25' },
    rejeitado: { label: 'Rejeitado', cls: 'bg-error/10 text-error border-error/25' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold', s.cls)}>
        {s.label}
      </span>
      {status === 'rejeitado' && nota && (
        <span
          title={`Motivo: ${nota}`}
          className="inline-flex items-center gap-0.5 text-[9px] text-error/70 font-medium cursor-help leading-none"
        >
          <Info size={8} />
          ver nota
        </span>
      )}
    </div>
  );
}

function TipoHoraBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    normal: { label: 'Normal', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    extra_50: { label: 'Extra 50%', cls: 'bg-blue-50 text-accent-blue border-blue-200' },
    extra_100: { label: 'Extra 100%', cls: 'bg-purple-50 text-purple-600 border-purple-200' },
  };
  const t = map[tipo] ?? { label: tipo, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold', t.cls)}>
      {t.label}
    </span>
  );
}

export function ApontamentosTable({
  apontamentos,
  onAprovar,
  onRejeitar,
  showActions = true,
  onViewFotos,
  isLoading = false,
  selectedIds,
  onSelectionChange,
}: ApontamentosTableProps) {
  const hasCheckboxes = !!onSelectionChange;
  const selectedSet = new Set(selectedIds ?? []);
  const pendingIds = apontamentos.filter((a) => a.status === 'pendente').map((a) => a.id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedSet.has(id));

  function toggleAll() {
    if (allPendingSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.([...pendingIds]);
    }
  }

  function toggleRow(id: string) {
    if (selectedSet.has(id)) {
      onSelectionChange?.((selectedIds ?? []).filter((x) => x !== id));
    } else {
      onSelectionChange?.([...(selectedIds ?? []), id]);
    }
  }

  const extraCols = hasCheckboxes ? 1 : 0;
  const colSpan = extraCols + (showActions ? 9 : 8);

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-border/60 hover:bg-transparent bg-gray-bg/40">
            {hasCheckboxes && (
              <TableHead className="w-9 pl-3 h-9">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={toggleAll}
                  disabled={pendingIds.length === 0}
                  className="w-3.5 h-3.5 rounded border-gray-border cursor-pointer disabled:opacity-30"
                  title={allPendingSelected ? 'Desmarcar todos' : 'Selecionar todos pendentes'}
                />
              </TableHead>
            )}
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted pl-5 h-9">Funcionário</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9">Obra</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9 hidden md:table-cell">Serviço</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9">Data</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9 hidden sm:table-cell">Período</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9">Total</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9 hidden lg:table-cell">Tipo</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9">Estado</TableHead>
            {showActions && (
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-right pr-5 h-9">Ações</TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {/* Loading skeletons */}
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i} className="border-gray-border/40">
                {hasCheckboxes && <TableCell className="w-9 pl-3"><Sk className="h-3.5 w-3.5 rounded" /></TableCell>}
                <TableCell className="pl-5 py-3">
                  <div className="flex items-center gap-2">
                    <Sk className="h-7 w-7 rounded-full shrink-0" />
                    <Sk className="h-3.5 w-24" />
                  </div>
                </TableCell>
                <TableCell className="text-center px-3"><Sk className="h-3.5 w-20 mx-auto" /></TableCell>
                <TableCell className="text-center px-3 hidden md:table-cell"><Sk className="h-3.5 w-28 mx-auto" /></TableCell>
                <TableCell className="text-center px-3"><Sk className="h-3.5 w-20 mx-auto" /></TableCell>
                <TableCell className="text-center px-3 hidden sm:table-cell"><Sk className="h-3.5 w-24 mx-auto" /></TableCell>
                <TableCell className="text-center px-3"><Sk className="h-3.5 w-12 mx-auto" /></TableCell>
                <TableCell className="text-center px-3 hidden lg:table-cell"><Sk className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                <TableCell className="text-center px-3"><Sk className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                {showActions && <TableCell className="pr-5"><Sk className="h-7 w-16 ml-auto rounded-lg" /></TableCell>}
              </TableRow>
            ))
          ) : apontamentos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-16 text-center">
                <p className="text-sm font-semibold text-gray-muted">Nenhum apontamento encontrado</p>
                <p className="text-[11px] text-gray-muted/70 mt-1">Tente ajustar os filtros</p>
              </TableCell>
            </TableRow>
          ) : (
            apontamentos.map((apt) => {
              const fotoUrls = apt.fotos?.map((f) => f.url) ?? [];
              const hasFotos = fotoUrls.length > 0;
              const isPending = apt.status === 'pendente';
              const isSelected = selectedSet.has(apt.id);

              return (
                <TableRow
                  key={apt.id}
                  className={cn(
                    'border-gray-border/40 hover:bg-gray-bg/50 transition-colors',
                    isSelected && 'bg-accent-blue/5'
                  )}
                >
                  {/* Checkbox */}
                  {hasCheckboxes && (
                    <TableCell className="w-9 pl-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(apt.id)}
                        disabled={!isPending}
                        className="w-3.5 h-3.5 rounded border-gray-border cursor-pointer disabled:opacity-20"
                      />
                    </TableCell>
                  )}

                  {/* Técnico */}
                  <TableCell className="pl-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden">
                        {apt.tecnico?.avatar_url
                          ? <img src={apt.tecnico.avatar_url} alt={apt.tecnico.full_name} className="w-full h-full object-cover" />
                          : <span className="text-[9px] font-black text-white">{apt.tecnico ? getInitials(apt.tecnico.full_name) : '??'}</span>
                        }
                      </div>
                      <span className="text-[12px] font-bold text-navy truncate max-w-[110px]">
                        {apt.tecnico?.full_name?.split(' ')[0] || 'N/A'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Obra */}
                  <TableCell className="text-center px-3">
                    <span className="text-[11px] text-gray-text truncate block max-w-[100px] mx-auto">
                      {apt.obra?.nome || <span className="text-gray-muted/60 italic">Oficina</span>}
                    </span>
                  </TableCell>

                  {/* Serviço */}
                  <TableCell className="text-center px-3 hidden md:table-cell">
                    <span className="text-[11px] text-gray-text truncate block max-w-[120px] mx-auto">
                      {apt.tipo_servico}
                    </span>
                  </TableCell>

                  {/* Data */}
                  <TableCell className="text-center px-3">
                    <span className="text-[11px] font-semibold text-gray-text tabular-nums">
                      {formatDate(apt.data_apontamento)}
                    </span>
                  </TableCell>

                  {/* Período */}
                  <TableCell className="text-center px-3 hidden sm:table-cell">
                    <span className="font-mono text-[10px] text-gray-muted">
                      {formatTime(apt.hora_entrada)} — {formatTime(apt.hora_saida)}
                    </span>
                  </TableCell>

                  {/* Total */}
                  <TableCell className="text-center px-3">
                    <span className="font-mono text-[13px] font-black text-navy tabular-nums">
                      {formatTotalHoras(apt.total_horas)}
                    </span>
                  </TableCell>

                  {/* Tipo hora */}
                  <TableCell className="text-center px-3 hidden lg:table-cell">
                    <TipoHoraBadge tipo={apt.tipo_hora} />
                  </TableCell>

                  {/* Estado */}
                  <TableCell className="text-center px-3">
                    <StatusBadge status={apt.status} nota={apt.nota_rejeicao} />
                  </TableCell>

                  {/* Ações */}
                  {showActions && (
                    <TableCell className="text-right pr-5 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {/* Botão fotos */}
                        {hasFotos && (
                          <button
                            onClick={() => onViewFotos?.(fotoUrls)}
                            title={`Ver ${fotoUrls.length} foto${fotoUrls.length > 1 ? 's' : ''}`}
                            className="relative w-7 h-7 rounded-lg bg-gray-100 text-gray-muted hover:bg-accent-blue/10 hover:text-accent-blue transition-all flex items-center justify-center"
                          >
                            <Camera size={13} />
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent-blue text-white text-[8px] font-black flex items-center justify-center leading-none">
                              {fotoUrls.length}
                            </span>
                          </button>
                        )}
                        {/* Aprovar / Rejeitar (só se pendente) */}
                        {isPending && (
                          <>
                            <button
                              onClick={() => onAprovar?.(apt.id)}
                              title="Aprovar"
                              className="w-7 h-7 rounded-lg bg-success/10 text-success hover:bg-success hover:text-white transition-all flex items-center justify-center"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => onRejeitar?.(apt.id)}
                              title="Rejeitar"
                              className="w-7 h-7 rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all flex items-center justify-center"
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
