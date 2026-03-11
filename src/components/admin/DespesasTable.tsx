'use client';

import React, { useState } from 'react';
import type { Despesa, DespesaStatus } from '@/types';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Check, X, Eye, FileText, Info, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DespesasTableProps {
  despesas: Despesa[];
  onAprovar?: (id: string) => void;
  onRejeitar?: (id: string) => void;
  showActions?: boolean;
  isLoading?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}
function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}
function eur(n: number) {
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/80 ${className}`} />;
}

function StatusPill({ status, nota }: { status: DespesaStatus; nota?: string | null }) {
  const map: Record<DespesaStatus, { label: string; cls: string }> = {
    pendente:  { label: 'Pendente',  cls: 'bg-amber-50 text-amber-700 border-amber-200'  },
    aprovada:  { label: 'Aprovada',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    rejeitada: { label: 'Rejeitada', cls: 'bg-red-50 text-red-600 border-red-200'        },
  };
  const s = map[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap', s.cls)}>
      {status === 'rejeitada' && nota && (
        <span title={`Motivo: ${nota}`} className="cursor-help shrink-0"><Info size={8} /></span>
      )}
      {s.label}
    </span>
  );
}

const TIPO_COLORS: Record<string, string> = {
  alojamento:    'bg-purple-50 text-purple-600 border-purple-200',
  'alimentação': 'bg-orange-50 text-orange-600 border-orange-200',
  combustível:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  material:      'bg-teal-50 text-teal-600 border-teal-200',
  outro:         'bg-gray-100 text-gray-500 border-gray-200',
};

function TipoBadge({ tipo }: { tipo: string }) {
  const cls = TIPO_COLORS[tipo] ?? 'bg-gray-100 text-gray-500 border-gray-200';
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap', cls)}>
      {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
    </span>
  );
}

export function DespesasTable({
  despesas,
  onAprovar,
  onRejeitar,
  showActions = true,
  isLoading = false,
  selectedIds,
  onSelectionChange,
}: DespesasTableProps) {
  const [viewDespesa, setViewDespesa] = useState<Despesa | null>(null);
  const hasCheckboxes = !!onSelectionChange;
  const selectedSet = new Set(selectedIds ?? []);
  const pendingIds = despesas.filter((d) => d.status === 'pendente').map((d) => d.id);
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
                  title={allPendingSelected ? 'Desmarcar todos' : 'Selecionar todos pendentes'}
                />
              </TableHead>
            )}
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted pl-4 h-9">Funcionário</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted h-9 hidden md:table-cell">Obra</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted text-center h-9 hidden lg:table-cell">Tipo</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted h-9 hidden lg:table-cell">Descrição</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted text-right h-9">Valor</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted text-center h-9 hidden sm:table-cell">Data</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-gray-muted text-center h-9">Estado</TableHead>
            {showActions && <TableHead className="w-[88px] pr-4 h-9" />}
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
              <TableCell className="hidden md:table-cell"><Sk className="h-3 w-24" /></TableCell>
              <TableCell className="text-center hidden lg:table-cell"><Sk className="h-5 w-16 mx-auto rounded-full" /></TableCell>
              <TableCell className="hidden lg:table-cell"><Sk className="h-3 w-28" /></TableCell>
              <TableCell className="text-right pr-4"><Sk className="h-3 w-16 ml-auto" /></TableCell>
              <TableCell className="text-center hidden sm:table-cell"><Sk className="h-3 w-16 mx-auto" /></TableCell>
              <TableCell className="text-center"><Sk className="h-5 w-16 mx-auto rounded-full" /></TableCell>
              {showActions && <TableCell className="pr-4"><Sk className="h-7 w-16 ml-auto rounded-lg" /></TableCell>}
            </TableRow>
          ))}

          {/* ── Empty state ── */}
          {!isLoading && despesas.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-16 text-center">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Receipt size={18} className="text-gray-muted/40" />
                  </div>
                  <p className="text-[13px] font-semibold text-navy">Nenhuma despesa encontrada</p>
                  <p className="text-[11px] text-gray-muted">Tente ajustar os filtros</p>
                </div>
              </TableCell>
            </TableRow>
          )}

          {/* ── Linhas ── */}
          {!isLoading && despesas.map((despesa) => {
            const isPending = despesa.status === 'pendente';
            const isSelected = selectedSet.has(despesa.id);
            const hasRecibos = (despesa.recibos?.length ?? 0) > 0;

            return (
              <TableRow
                key={despesa.id}
                onClick={() => setViewDespesa(despesa)}
                className={cn(
                  'border-gray-border/40 hover:bg-gray-bg/50 transition-colors cursor-pointer',
                  isSelected && 'bg-blue-50/60',
                  isPending && !isSelected && 'border-l-2 border-l-amber-400'
                )}
              >
                {/* Checkbox */}
                {hasCheckboxes && (
                  <TableCell className="pl-4 py-2.5 w-9" onClick={(e) => e.stopPropagation()}>
                    {isPending && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(despesa.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer"
                      />
                    )}
                  </TableCell>
                )}

                {/* Técnico */}
                <TableCell className="pl-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden">
                      {despesa.tecnico?.avatar_url
                        ? <img src={despesa.tecnico.avatar_url} alt={despesa.tecnico.full_name} className="w-full h-full object-cover" />
                        : <span className="text-[9px] font-black text-white">{despesa.tecnico ? getInitials(despesa.tecnico.full_name) : '??'}</span>
                      }
                    </div>
                    <span className="text-[12px] font-bold text-navy truncate max-w-[100px]">
                      {despesa.tecnico?.full_name?.split(' ')[0] || 'N/A'}
                    </span>
                  </div>
                </TableCell>

                {/* Obra */}
                <TableCell className="hidden md:table-cell py-2.5 px-3">
                  <span className="text-[11px] text-gray-text truncate block max-w-[120px]">
                    {despesa.obra?.nome || <span className="text-gray-muted italic">Oficina</span>}
                  </span>
                </TableCell>

                {/* Tipo */}
                <TableCell className="text-center py-2.5 px-3 hidden lg:table-cell">
                  <TipoBadge tipo={despesa.tipo_despesa} />
                </TableCell>

                {/* Descrição */}
                <TableCell className="py-2.5 px-3 hidden lg:table-cell">
                  <span className="text-[11px] text-gray-muted truncate block max-w-[140px]">
                    {despesa.descricao || <span className="italic opacity-50">—</span>}
                  </span>
                </TableCell>

                {/* Valor */}
                <TableCell className="text-right py-2.5 px-3">
                  <span className="font-black text-[13px] text-navy tabular-nums">
                    {eur(Number(despesa.valor))}
                  </span>
                </TableCell>

                {/* Data */}
                <TableCell className="text-center py-2.5 px-3 hidden sm:table-cell">
                  <span className="text-[11px] font-semibold text-gray-text tabular-nums">
                    {formatDate(despesa.data_despesa)}
                  </span>
                </TableCell>

                {/* Estado */}
                <TableCell className="text-center py-2.5 px-3">
                  <StatusPill status={despesa.status} nota={despesa.nota_rejeicao} />
                </TableCell>

                {/* Ações */}
                {showActions && (
                  <TableCell className="pr-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setViewDespesa(despesa)}
                        title={hasRecibos ? `${despesa.recibos!.length} recibo(s)` : 'Ver detalhes'}
                        className="relative w-7 h-7 rounded-lg bg-gray-100 text-gray-muted hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center"
                      >
                        <Eye size={13} />
                        {hasRecibos && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[8px] font-black flex items-center justify-center leading-none">
                            {despesa.recibos!.length}
                          </span>
                        )}
                      </button>
                      {isPending && (
                        <>
                          <button
                            onClick={() => onAprovar?.(despesa.id)}
                            title="Aprovar"
                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-navy hover:text-white transition-all flex items-center justify-center"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => onRejeitar?.(despesa.id)}
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

      {/* ── Dialog detalhe + recibos ── */}
      <Dialog open={!!viewDespesa} onOpenChange={(o) => !o && setViewDespesa(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-gray-border/60">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Despesa</p>
              <DialogTitle className="text-navy font-black text-[16px] tracking-tight mt-0.5">
                {viewDespesa?.tecnico?.full_name}
              </DialogTitle>
            </div>
          </DialogHeader>
          {viewDespesa && (
            <div className="px-5 py-4 space-y-4">
              <div className="bg-gray-bg rounded-xl border border-gray-border/60 p-4 space-y-2.5">
                {([
                  { label: 'Tipo',      value: viewDespesa.tipo_despesa.charAt(0).toUpperCase() + viewDespesa.tipo_despesa.slice(1) },
                  { label: 'Obra',      value: viewDespesa.obra?.nome || 'Oficina' },
                  { label: 'Valor',     value: eur(Number(viewDespesa.valor)) },
                  { label: 'Data',      value: new Date(viewDespesa.data_despesa + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) },
                  ...(viewDespesa.descricao ? [{ label: 'Descrição', value: viewDespesa.descricao }] : []),
                  ...(viewDespesa.status === 'rejeitada' && viewDespesa.nota_rejeicao
                    ? [{ label: 'Motivo', value: viewDespesa.nota_rejeicao }] : []),
                ] as { label: string; value: string }[]).map((row, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-muted w-20 shrink-0 pt-0.5">{row.label}</span>
                    <span className="text-[12px] font-semibold text-navy">{row.value}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted mb-2">
                  Recibos {(viewDespesa.recibos?.length ?? 0) > 0 ? `(${viewDespesa.recibos!.length})` : ''}
                </p>
                {(viewDespesa.recibos?.length ?? 0) === 0 ? (
                  <p className="text-center text-gray-muted text-sm py-6 bg-gray-bg rounded-xl border border-gray-border/60">
                    Sem recibos anexados
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {viewDespesa.recibos!.map((recibo, i) =>
                      recibo.tipo_ficheiro === 'imagem' ? (
                        <a key={recibo.id ?? i} href={recibo.url} target="_blank" rel="noopener noreferrer" className="block group">
                          <img
                            src={recibo.url}
                            alt="Recibo"
                            className="w-full rounded-xl object-cover aspect-square border border-gray-border shadow-sm group-hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : (
                        <a
                          key={recibo.id ?? i}
                          href={recibo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center gap-2 aspect-square rounded-xl border border-gray-border bg-red-50 hover:bg-red-100 transition-colors p-3"
                        >
                          <FileText size={28} className="text-red-500" />
                          <span className="text-[11px] text-red-600 font-semibold text-center">Abrir PDF</span>
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
