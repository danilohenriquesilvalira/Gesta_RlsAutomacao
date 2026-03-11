import React from 'react';
import { X, CheckCircle2, XCircle, Building2, Receipt, Info, Hash, CalendarDays, FileText, ExternalLink, Users } from 'lucide-react';
import { DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Despesa } from '@/types';

function eur(n: number) {
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function StatusPill({ status, nota }: { status: string; nota?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente:  { label: 'Pendente',  cls: 'bg-amber-50 text-amber-700 border-amber-200'  },
    aprovada:  { label: 'Aprovada',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    rejeitada: { label: 'Rejeitada', cls: 'bg-red-50 text-red-600 border-red-200'        },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap', s.cls)}>
      {status === 'rejeitada' && nota && (
        <span title={`Motivo: ${nota}`} className="cursor-help shrink-0"><Info size={8} /></span>
      )}
      {s.label}
    </span>
  );
}

export function DespesaDetalheModal({
  desp,
  onClose,
  onAprovar,
  onRejeitar,
  busy,
}: {
  desp: Despesa;
  onClose: () => void;
  onAprovar: (id: string) => void;
  onRejeitar: (ids: string[]) => void;
  busy: boolean;
}) {
  const rows = ([
    { label: 'Tipo',      value: desp.tipo_despesa,  icon: <Receipt size={14} className="text-gray-400" /> },
    { label: 'Data',      value: new Date(desp.data_despesa + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }), icon: <CalendarDays size={14} className="text-gray-400" /> },
    { label: 'Obra',      value: desp.obra?.nome ?? '—', icon: <Building2 size={14} className="text-gray-400" /> },
    ...(desp.obra?.codigo ? [{ label: 'Cód. Obra', value: desp.obra.codigo, icon: <Hash size={14} className="text-gray-400" /> }] : []),
    ...(desp.descricao ? [{ label: 'Descrição', value: desp.descricao, icon: <Info size={14} className="text-gray-400" /> }] : []),
  ] as { label: string; value: string; icon: React.ReactNode }[]);

  return (
    <DialogContent
      showCloseButton={false}
      className="w-[calc(100%-2rem)] max-w-lg p-0 gap-0 flex flex-col overflow-hidden rounded-2xl border border-gray-100 shadow-2xl"
      style={{ height: 'min(88vh, 580px)' }}
    >
      <DialogTitle className="sr-only">Detalhe da Despesa</DialogTitle>

      {/* Cabeçalho */}
      <div className="shrink-0 px-5 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {desp.tecnico?.full_name ?? 'Técnico'}
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-navy transition-colors"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Valor da Despesa</p>
            <p className="text-[28px] font-black text-navy tabular-nums leading-none font-mono">
              {eur(Number(desp.valor))}
            </p>
            <p className="text-[11px] text-gray-400 mt-1.5">
              {new Date(desp.data_despesa + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <StatusPill status={desp.status} nota={desp.nota_rejeicao} />
        </div>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto modal-scroll px-6 py-5 space-y-3">
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          {rows.map((row, i, arr) => (
            <div key={i} className={cn('flex items-center gap-4 px-5 py-3.5', i < arr.length - 1 && 'border-b border-gray-50')}>
              <span className="shrink-0 flex items-center justify-center w-5">{row.icon}</span>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">{row.label}</span>
                <span className="text-[13px] font-semibold text-navy text-right truncate">{row.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quem beneficiou */}
        {(desp.despesa_participantes?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Users size={12} className="text-indigo-400 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Cobriu {desp.despesa_participantes!.length} colega{desp.despesa_participantes!.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {desp.despesa_participantes!.map((p) => (
                <span key={p.tecnico.id} className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                  {p.tecnico.full_name.split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
        )}

        {desp.status === 'rejeitada' && desp.nota_rejeicao && (
          <div className="rounded-2xl border border-red-100 bg-red-50/50 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1.5">Motivo da Rejeição</p>
            <p className="text-[13px] text-red-700 leading-relaxed">{desp.nota_rejeicao}</p>
          </div>
        )}

        {(desp.recibos?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">
              Recibos ({desp.recibos!.length})
            </p>
            <div className="flex flex-col gap-2">
              {desp.recibos!.map((r, i) => (
                r.tipo_ficheiro === 'imagem'
                  ? (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer">
                      <img src={r.url} alt={`Recibo ${i + 1}`} className="w-full rounded-xl object-cover aspect-video border border-gray-border shadow-sm hover:opacity-90 transition-opacity" />
                    </a>
                  ) : (
                    <a
                      key={i}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-xl border border-gray-border bg-gray-bg hover:bg-white transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-red-500" />
                      </div>
                      <span className="flex-1 text-[12px] font-semibold text-navy truncate">Recibo PDF {i + 1}</span>
                      <ExternalLink size={12} className="text-gray-muted shrink-0" />
                    </a>
                  )
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rodapé */}
      {desp.status === 'pendente' && (
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => { onAprovar(desp.id); onClose(); }}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-navy text-white text-[13px] font-bold hover:opacity-90 transition-all disabled:opacity-40 shadow-sm"
          >
            <CheckCircle2 size={15} strokeWidth={2} /> Aprovar
          </button>
          <button
            onClick={() => { onRejeitar([desp.id]); onClose(); }}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-red-200 text-red-500 text-[13px] font-bold hover:bg-red-500 hover:text-white hover:border-transparent transition-all disabled:opacity-40"
          >
            <XCircle size={15} strokeWidth={2} /> Rejeitar
          </button>
        </div>
      )}
    </DialogContent>
  );
}
