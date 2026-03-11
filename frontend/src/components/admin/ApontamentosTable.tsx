'use client';

import React, { useState } from 'react';
import type { Apontamento } from '@/types';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Check, X, Camera, Info, Clock } from 'lucide-react';
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
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}
function formatTime(t: string | null): string {
  if (!t) return '--:--';
  return t.slice(0, 5);
}
function formatTotalHoras(total: number | null): string {
  if (total == null) return '--';
  const h = Math.floor(total), m = Math.round((total - h) * 60);
  return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
}
function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/80 ${className}`} />;
}

function StatusPill({ status, nota }: { status: string; nota?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente:  { label: 'Pendente',  cls: 'bg-amber-50 text-amber-700 border-amber-200'     },
    aprovado:  { label: 'Aprovado',  cls: 'bg-slate-100 text-slate-600 border-slate-200'    },
    rejeitado: { label: 'Rejeitado', cls: 'bg-red-50 text-red-600 border-red-200'           },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap', s.cls)}>
      {status === 'rejeitado' && nota && (
        <span title={`Motivo: ${nota}`} className="cursor-help shrink-0"><Info size={8} /></span>
      )}
      {s.label}
    </span>
  );
}

function TipoHoraPill({ tipo }: { tipo: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    normal:    { label: 'Normal', cls: 'bg-gray-100 text-gray-500 border-gray-200'         },
    extra_50:  { label: '+50%',   cls: 'bg-blue-50 text-blue-600 border-blue-200'          },
    extra_100: { label: '+100%',  cls: 'bg-violet-50 text-violet-600 border-violet-200'    },
  };
  const t = map[tipo] ?? { label: tipo, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap', t.cls)}>
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
  const [viewApt, setViewApt] = useState<Apontamento | null>(null);
  const hasCheckboxes = !!onSelectionChange;
  const selectedSet = new Set(selectedIds ?? []);
  const pendingIds = apontamentos.filter((a) => a.status === 'pendente').map((a) => a.id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedSet.has(id));

  function toggleAll() {
    if (allPendingSelected) onSelectionChange?.([]);
    else onSelectionChange?.([...pendingIds]);
  }
  function toggleRow(id: string) {
    if (selectedSet.has(id)) onSelectionChange?.((selectedIds ?? []).filter((x) => x !== id));
    else onSelectionChange?.([...(selectedIds ?? []), id]);
  }

  const colSpan = (hasCheckboxes ? 1 : 0) + (showActions ? 8 : 7);

  return (
    <>
      <Table>
        {/* ── Header sticky ── */}
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-gray-border/60 hover:bg-transparent bg-gray-bg/80 backdrop-blur-sm">
            {hasCheckboxes && (
              <TableHead className="w-9 pl-4 h-9">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={toggleAll}
                  disabled={pendingIds.length === 0}
                  className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer disabled:opacity-30"
                />
              </TableHead>
            )}
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted pl-4 h-9">Funcionário</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted h-9 hidden md:table-cell">Obra · Serviço</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted text-center h-9">Data</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted text-center h-9 hidden sm:table-cell">Período</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted text-center h-9">Total</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted text-center h-9 hidden lg:table-cell">Tipo</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted text-center h-9">Estado</TableHead>
            {showActions && (
              <TableHead className="w-[88px] pr-4 h-9" />
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {/* ── Skeletons ── */}
          {isLoading && Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i} className="border-gray-border/40">
              {hasCheckboxes && <TableCell className="pl-4"><Sk className="h-3.5 w-3.5 rounded" /></TableCell>}
              <TableCell className="pl-4 py-3">
                <div className="flex items-center gap-2">
                  <Sk className="h-7 w-7 rounded-full shrink-0" />
                  <Sk className="h-3 w-24" />
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell"><Sk className="h-3 w-32" /></TableCell>
              <TableCell className="text-center"><Sk className="h-3 w-16 mx-auto" /></TableCell>
              <TableCell className="text-center hidden sm:table-cell"><Sk className="h-3 w-20 mx-auto" /></TableCell>
              <TableCell className="text-center"><Sk className="h-3 w-10 mx-auto" /></TableCell>
              <TableCell className="text-center hidden lg:table-cell"><Sk className="h-5 w-14 mx-auto rounded-full" /></TableCell>
              <TableCell className="text-center"><Sk className="h-5 w-16 mx-auto rounded-full" /></TableCell>
              {showActions && <TableCell className="pr-4"><Sk className="h-7 w-16 ml-auto rounded-lg" /></TableCell>}
            </TableRow>
          ))}

          {/* ── Empty state ── */}
          {!isLoading && apontamentos.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-16 text-center">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Clock size={18} className="text-gray-muted/40" />
                  </div>
                  <p className="text-[13px] font-semibold text-navy">Nenhum apontamento encontrado</p>
                  <p className="text-[11px] text-gray-muted">Tente ajustar os filtros</p>
                </div>
              </TableCell>
            </TableRow>
          )}

          {/* ── Linhas ── */}
          {!isLoading && apontamentos.map((apt) => {
            const fotoUrls = apt.fotos?.map((f) => f.url) ?? [];
            const hasFotos = fotoUrls.length > 0;
            const isPending = apt.status === 'pendente';
            const isSelected = selectedSet.has(apt.id);

            return (
              <TableRow
                key={apt.id}
                onClick={() => setViewApt(apt)}
                className={cn(
                  'border-gray-border/40 hover:bg-gray-bg/50 transition-colors cursor-pointer',
                  isSelected && 'bg-blue-50/60',
                  isPending && !isSelected && 'border-l-2 border-l-amber-400'
                )}
              >
                {/* Checkbox */}
                {hasCheckboxes && (
                  <TableCell className="pl-4 py-2.5 w-9" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(apt.id)}
                      disabled={!isPending}
                      className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer disabled:opacity-20"
                    />
                  </TableCell>
                )}

                {/* Técnico */}
                <TableCell className="pl-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden">
                      {apt.tecnico?.avatar_url
                        ? <img src={apt.tecnico.avatar_url} alt={apt.tecnico.full_name} className="w-full h-full object-cover" />
                        : <span className="text-[9px] font-black text-white">{apt.tecnico ? getInitials(apt.tecnico.full_name) : '??'}</span>
                      }
                    </div>
                    <span className="text-[12px] font-bold text-navy truncate max-w-[100px]">
                      {apt.tecnico?.full_name?.split(' ')[0] || 'N/A'}
                    </span>
                  </div>
                </TableCell>

                {/* Obra · Serviço */}
                <TableCell className="hidden md:table-cell py-2.5 px-3">
                  <p className="text-[11px] font-semibold text-navy truncate max-w-[160px]">
                    {apt.obra?.nome || <span className="text-gray-muted italic font-normal">Oficina</span>}
                  </p>
                  <p className="text-[10px] text-gray-muted truncate max-w-[160px] mt-0.5">{apt.tipo_servico}</p>
                </TableCell>

                {/* Data */}
                <TableCell className="text-center py-2.5 px-3">
                  <span className="text-[11px] font-semibold text-navy tabular-nums">
                    {formatDate(apt.data_apontamento)}
                  </span>
                </TableCell>

                {/* Período */}
                <TableCell className="text-center py-2.5 px-3 hidden sm:table-cell">
                  <span className="font-mono text-[10px] text-gray-muted tabular-nums">
                    {formatTime(apt.hora_entrada)}–{formatTime(apt.hora_saida)}
                  </span>
                </TableCell>

                {/* Total */}
                <TableCell className="text-center py-2.5 px-3">
                  <span className="font-mono text-[13px] font-black text-navy tabular-nums">
                    {formatTotalHoras(apt.total_horas)}
                  </span>
                </TableCell>

                {/* Tipo hora */}
                <TableCell className="text-center py-2.5 px-3 hidden lg:table-cell">
                  <TipoHoraPill tipo={apt.tipo_hora} />
                </TableCell>

                {/* Estado */}
                <TableCell className="text-center py-2.5 px-3">
                  <StatusPill status={apt.status} nota={apt.nota_rejeicao} />
                </TableCell>

                {/* Ações */}
                {showActions && (
                  <TableCell className="pr-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {hasFotos && (
                        <button
                          onClick={() => onViewFotos?.(fotoUrls)}
                          title={`${fotoUrls.length} foto(s)`}
                          className="relative w-7 h-7 rounded-lg bg-gray-100 text-gray-muted hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center"
                        >
                          <Camera size={13} />
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[8px] font-black flex items-center justify-center leading-none">
                            {fotoUrls.length}
                          </span>
                        </button>
                      )}
                      {isPending && (
                        <>
                          <button
                            onClick={() => onAprovar?.(apt.id)}
                            title="Aprovar"
                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-navy hover:text-white transition-all flex items-center justify-center"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => onRejeitar?.(apt.id)}
                            title="Rejeitar"
                            className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
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
          })}
        </TableBody>
      </Table>

      {/* ── Dialog detalhe ── */}
      <Dialog open={!!viewApt} onOpenChange={(o) => !o && setViewApt(null)}>
        <DialogContent className="max-w-md rounded-2xl p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-gray-border/60">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Apontamento</p>
              <DialogTitle className="text-navy font-black text-[16px] tracking-tight mt-0.5">
                {viewApt?.tecnico?.full_name || 'Detalhe'}
              </DialogTitle>
            </div>
          </DialogHeader>
          {viewApt && (
            <div className="px-5 py-4 space-y-4">
              <div className="bg-gray-bg rounded-xl border border-gray-border/60 p-4 space-y-2.5">
                {([
                  { label: 'Obra',      value: viewApt.obra?.nome || 'Oficina' },
                  { label: 'Serviço',   value: viewApt.tipo_servico },
                  { label: 'Data',      value: new Date(viewApt.data_apontamento + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) },
                  { label: 'Entrada',   value: formatTime(viewApt.hora_entrada) },
                  { label: 'Saída',     value: formatTime(viewApt.hora_saida) },
                  { label: 'Total',     value: formatTotalHoras(viewApt.total_horas) },
                  { label: 'Tipo hora', value: viewApt.tipo_hora === 'normal' ? 'Normal' : viewApt.tipo_hora === 'extra_50' ? 'Extra 50%' : 'Extra 100%' },
                  ...(viewApt.descricao ? [{ label: 'Descrição', value: viewApt.descricao }] : []),
                  ...(viewApt.status === 'rejeitado' && viewApt.nota_rejeicao
                    ? [{ label: 'Motivo', value: viewApt.nota_rejeicao }] : []),
                ] as { label: string; value: string }[]).map((row, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-muted w-20 shrink-0 pt-0.5">{row.label}</span>
                    <span className="text-[12px] font-semibold text-navy">{row.value}</span>
                  </div>
                ))}
              </div>
              {(viewApt.fotos?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted mb-2">
                    Fotos ({viewApt.fotos!.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {viewApt.fotos!.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={f.url}
                          alt={`Foto ${i + 1}`}
                          className="w-full rounded-xl object-cover aspect-square border border-gray-border shadow-sm hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
