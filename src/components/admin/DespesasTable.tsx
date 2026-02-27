'use client';

import React, { useState } from 'react';
import type { Despesa, DespesaStatus } from '@/types';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Check, X, Eye, FileText, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DespesasTableProps {
  despesas: Despesa[];
  onAprovar?: (id: string) => void;
  onRejeitar?: (id: string) => void;
  showActions?: boolean;
  isLoading?: boolean;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}
function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/80 ${className}`} />;
}

function StatusBadge({ status, nota }: { status: DespesaStatus; nota?: string | null }) {
  const map: Record<DespesaStatus, { label: string; cls: string }> = {
    pendente: { label: 'Pendente', cls: 'bg-warning/10 text-warning border-warning/25' },
    aprovada: { label: 'Aprovada', cls: 'bg-success/10 text-success border-success/25' },
    rejeitada: { label: 'Rejeitada', cls: 'bg-error/10 text-error border-error/25' },
  };
  const s = map[status];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold', s.cls)}>
        {s.label}
      </span>
      {status === 'rejeitada' && nota && (
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

function TipoBadge({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = {
    alojamento: 'bg-purple-50 text-purple-600 border-purple-200',
    'alimentação': 'bg-orange-50 text-orange-600 border-orange-200',
    transporte: 'bg-sky-50 text-sky-600 border-sky-200',
    'combustível': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    material: 'bg-teal-50 text-teal-600 border-teal-200',
    outro: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const cls = colors[tipo] ?? 'bg-gray-100 text-gray-500 border-gray-200';
  const label = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold', cls)}>
      {label}
    </span>
  );
}

export function DespesasTable({
  despesas,
  onAprovar,
  onRejeitar,
  showActions = true,
  isLoading = false,
}: DespesasTableProps) {
  const [viewDespesa, setViewDespesa] = useState<Despesa | null>(null);

  return (
    <>
      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-border/60 hover:bg-transparent bg-gray-bg/40">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted pl-5 h-9">Funcionário</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9 hidden md:table-cell">Obra</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9">Tipo</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9 hidden lg:table-cell">Descrição</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9">Valor</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-muted text-center h-9 hidden sm:table-cell">Data</TableHead>
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
                  <TableCell className="pl-5 py-3">
                    <div className="flex items-center gap-2">
                      <Sk className="h-7 w-7 rounded-full shrink-0" />
                      <Sk className="h-3.5 w-24" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-3 hidden md:table-cell"><Sk className="h-3.5 w-20 mx-auto" /></TableCell>
                  <TableCell className="text-center px-3"><Sk className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                  <TableCell className="text-center px-3 hidden lg:table-cell"><Sk className="h-3.5 w-28 mx-auto" /></TableCell>
                  <TableCell className="text-center px-3"><Sk className="h-3.5 w-16 mx-auto" /></TableCell>
                  <TableCell className="text-center px-3 hidden sm:table-cell"><Sk className="h-3.5 w-20 mx-auto" /></TableCell>
                  <TableCell className="text-center px-3"><Sk className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                  {showActions && <TableCell className="pr-5"><Sk className="h-7 w-20 ml-auto rounded-lg" /></TableCell>}
                </TableRow>
              ))
            ) : despesas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showActions ? 8 : 7} className="py-16 text-center">
                  <p className="text-sm font-semibold text-gray-muted">Nenhuma despesa encontrada</p>
                  <p className="text-[11px] text-gray-muted/70 mt-1">Tente ajustar os filtros</p>
                </TableCell>
              </TableRow>
            ) : (
              despesas.map((despesa) => (
                <TableRow
                  key={despesa.id}
                  className="border-gray-border/40 hover:bg-gray-bg/50 transition-colors cursor-pointer"
                  onClick={() => setViewDespesa(despesa)}
                >
                  {/* Técnico */}
                  <TableCell className="pl-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden">
                        {despesa.tecnico?.avatar_url
                          ? <img src={despesa.tecnico.avatar_url} alt={despesa.tecnico.full_name} className="w-full h-full object-cover" />
                          : <span className="text-[9px] font-black text-white">{despesa.tecnico ? getInitials(despesa.tecnico.full_name) : '??'}</span>
                        }
                      </div>
                      <span className="text-[12px] font-bold text-navy truncate max-w-[110px]">
                        {despesa.tecnico?.full_name?.split(' ')[0] || 'N/A'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Obra */}
                  <TableCell className="text-center px-3 hidden md:table-cell">
                    <span className="text-[11px] text-gray-text truncate block max-w-[100px] mx-auto">
                      {despesa.obra?.nome || <span className="text-gray-muted/60 italic">Oficina</span>}
                    </span>
                  </TableCell>

                  {/* Tipo */}
                  <TableCell className="text-center px-3">
                    <TipoBadge tipo={despesa.tipo_despesa} />
                  </TableCell>

                  {/* Descrição */}
                  <TableCell className="text-center px-3 hidden lg:table-cell">
                    <span className="text-[11px] text-gray-muted truncate block max-w-[140px] mx-auto">
                      {despesa.descricao || <span className="italic opacity-50">—</span>}
                    </span>
                  </TableCell>

                  {/* Valor */}
                  <TableCell className="text-center px-3">
                    <span className="font-black text-[13px] text-navy tabular-nums">
                      {Number(despesa.valor).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </TableCell>

                  {/* Data */}
                  <TableCell className="text-center px-3 hidden sm:table-cell">
                    <span className="text-[11px] font-semibold text-gray-text tabular-nums">
                      {formatDate(despesa.data_despesa)}
                    </span>
                  </TableCell>

                  {/* Estado */}
                  <TableCell className="text-center px-3">
                    <StatusBadge status={despesa.status} nota={despesa.nota_rejeicao} />
                  </TableCell>

                  {/* Ações */}
                  {showActions && (
                    <TableCell
                      className="text-right pr-5 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {/* Ver recibos */}
                        <button
                          onClick={() => setViewDespesa(despesa)}
                          title={`Ver detalhes${(despesa.recibos?.length ?? 0) > 0 ? ` (${despesa.recibos!.length} recibo${despesa.recibos!.length > 1 ? 's' : ''})` : ''}`}
                          className="relative w-7 h-7 rounded-lg bg-gray-100 text-gray-muted hover:bg-accent-blue/10 hover:text-accent-blue transition-all flex items-center justify-center"
                        >
                          <Eye size={13} />
                          {(despesa.recibos?.length ?? 0) > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent-blue text-white text-[8px] font-black flex items-center justify-center leading-none">
                              {despesa.recibos!.length}
                            </span>
                          )}
                        </button>

                        {/* Aprovar / Rejeitar */}
                        {despesa.status === 'pendente' && (
                          <>
                            <button
                              onClick={() => onAprovar?.(despesa.id)}
                              title="Aprovar"
                              className="w-7 h-7 rounded-lg bg-success/10 text-success hover:bg-success hover:text-white transition-all flex items-center justify-center"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => onRejeitar?.(despesa.id)}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Dialog: detalhes + recibos ────────────────────────────────────── */}
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
              {/* Info */}
              <div className="bg-gray-bg rounded-xl border border-gray-border/60 p-4 space-y-2">
                {[
                  { label: 'Tipo', value: viewDespesa.tipo_despesa.charAt(0).toUpperCase() + viewDespesa.tipo_despesa.slice(1) },
                  { label: 'Obra', value: viewDespesa.obra?.nome || 'Oficina' },
                  { label: 'Valor', value: `${Number(viewDespesa.valor).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €` },
                  { label: 'Data', value: formatDate(viewDespesa.data_despesa) },
                  ...(viewDespesa.descricao ? [{ label: 'Descrição', value: viewDespesa.descricao }] : []),
                  ...(viewDespesa.status === 'rejeitada' && viewDespesa.nota_rejeicao
                    ? [{ label: 'Motivo', value: viewDespesa.nota_rejeicao }]
                    : []),
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-muted w-20 shrink-0 pt-0.5">{row.label}</span>
                    <span className="text-[12px] font-semibold text-navy">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Recibos */}
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
                    {viewDespesa.recibos!.map((recibo) =>
                      recibo.tipo_ficheiro === 'imagem' ? (
                        <a key={recibo.id} href={recibo.url} target="_blank" rel="noopener noreferrer" className="block group">
                          <img
                            src={recibo.url}
                            alt="Recibo"
                            className="w-full rounded-xl object-cover aspect-square border border-gray-border shadow-sm group-hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : (
                        <a
                          key={recibo.id}
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
