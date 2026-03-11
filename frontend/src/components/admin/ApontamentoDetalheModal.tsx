import React from 'react';
import { X, CheckCircle2, XCircle, Building2, Wrench, LogIn, LogOut, Timer, Info, Hash, CalendarDays } from 'lucide-react';
import { DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Apontamento } from '@/types';

function fmtH(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}
function fmtTime(t: string | null) { return t ? t.slice(0, 5) : '--:--'; }

function StatusPill({ status, nota }: { status: string; nota?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente:  { label: 'Pendente',  cls: 'bg-amber-50 text-amber-700 border-amber-200'  },
    aprovado:  { label: 'Aprovado',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    rejeitado: { label: 'Rejeitado', cls: 'bg-red-50 text-red-600 border-red-200'        },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap leading-none', s.cls)}>
      {status === 'rejeitado' && nota && (
        <span title={`Motivo: ${nota}`} className="cursor-help shrink-0"><Info size={9} /></span>
      )}
      {s.label}
    </span>
  );
}

export function ApontamentoDetalheModal({
  apt,
  onClose,
  onAprovar,
  onRejeitar,
  busy,
}: {
  apt: Apontamento;
  onClose: () => void;
  onAprovar: (id: string) => void;
  onRejeitar: (ids: string[]) => void;
  busy: boolean;
}) {
  const rows = [
    { label: 'Obra',      value: apt.obra?.nome || 'Oficina',  icon: <Building2 size={14} className="text-gray-400" /> },
    ...(apt.obra?.codigo ? [{ label: 'Cód. Obra', value: apt.obra.codigo, icon: <Hash size={14} className="text-gray-400" /> }] : []),
    { label: 'Serviço',   value: apt.tipo_servico,             icon: <Wrench size={14} className="text-gray-400" /> },
    { label: 'Entrada',   value: fmtTime(apt.hora_entrada),    icon: <LogIn size={14} className="text-gray-400" /> },
    { label: 'Saída',     value: fmtTime(apt.hora_saida),      icon: <LogOut size={14} className="text-gray-400" /> },
    { label: 'Tipo hora', value: apt.tipo_hora === 'normal' ? 'Normal' : apt.tipo_hora === 'extra_50' ? 'Extra +50%' : 'Extra +100%', icon: <Timer size={14} className="text-gray-400" /> },
  ];

  return (
    <DialogContent
      showCloseButton={false}
      className="w-[calc(100%-2rem)] max-w-lg p-0 gap-0 flex flex-col overflow-hidden rounded-2xl border border-gray-100 shadow-2xl"
      style={{ height: 'min(88vh, 600px)' }}
    >
      <DialogTitle className="sr-only">Detalhe do Apontamento</DialogTitle>

      {/* Cabeçalho */}
      <div className="shrink-0 px-5 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {apt.tecnico?.full_name ?? 'Técnico'}
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
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total de horas</p>
            <p className="text-[28px] font-black text-navy tabular-nums leading-none">
              {fmtH(apt.total_horas ?? 0)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1.5">
              {new Date(apt.data_apontamento + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <StatusPill status={apt.status} nota={apt.nota_rejeicao} />
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

        {apt.descricao && (
          <div className="rounded-2xl border border-gray-100 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Descrição</p>
            <p className="text-[13px] text-navy leading-relaxed">{apt.descricao}</p>
          </div>
        )}

        {apt.status === 'rejeitado' && apt.nota_rejeicao && (
          <div className="rounded-2xl border border-red-100 bg-red-50/50 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1.5">Motivo da Rejeição</p>
            <p className="text-[13px] text-red-700 leading-relaxed">{apt.nota_rejeicao}</p>
          </div>
        )}

        {(apt.fotos?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">
              Fotos ({apt.fotos!.length})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {apt.fotos!.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer">
                  <img src={f.url} alt={`Foto ${i + 1}`} className="w-full rounded-xl object-cover aspect-square border border-gray-100 shadow-sm hover:opacity-90 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rodapé */}
      {apt.status === 'pendente' && (
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => { onAprovar(apt.id); onClose(); }}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-navy text-white text-[13px] font-bold hover:opacity-90 transition-all disabled:opacity-40 shadow-sm"
          >
            <CheckCircle2 size={15} strokeWidth={2} /> Aprovar
          </button>
          <button
            onClick={() => { onRejeitar([apt.id]); onClose(); }}
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
