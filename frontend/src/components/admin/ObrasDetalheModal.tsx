import React from 'react';
import {
  X, Building2, Hash, Users, Clock, Wallet, CalendarDays,
  MapPin, CheckCircle2, XCircle, AlertCircle, Wrench, Receipt,
} from 'lucide-react';
import { DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Obra, Apontamento, Despesa } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────
function eur(n: number) {
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtH(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}
function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}
function getDaysLeft(prazo: string | null): number | null {
  if (!prazo) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(prazo + 'T00:00:00').getTime() - today.getTime()) / 86400000);
}

// ── Status pills ───────────────────────────────────────────────────────────
const STATUS_OBRA: Record<string, { label: string; cls: string }> = {
  ativa:     { label: 'Ativa',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  pausada:   { label: 'Pausada',   cls: 'bg-amber-100 text-amber-700 border-amber-200'       },
  concluida: { label: 'Concluída', cls: 'bg-gray-100 text-gray-500 border-gray-200'          },
};
const STATUS_APT: Record<string, { label: string; cls: string }> = {
  pendente:  { label: 'Pendente',  cls: 'bg-amber-50 text-amber-700 border-amber-200'  },
  aprovado:  { label: 'Aprovado',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  rejeitado: { label: 'Rejeitado', cls: 'bg-red-50 text-red-600 border-red-200'        },
};
const STATUS_DSP: Record<string, { label: string; cls: string }> = {
  pendente:  { label: 'Pendente',  cls: 'bg-amber-50 text-amber-700 border-amber-200'  },
  aprovada:  { label: 'Aprovada',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  rejeitada: { label: 'Rejeitada', cls: 'bg-red-50 text-red-600 border-red-200'        },
};
const TIPO_DOT: Record<string, string> = {
  combustível: '#eab308', alimentação: '#f97316', alojamento: '#8b5cf6',
  material: '#14b8a6', transporte: '#3D5AFE', outro: '#94a3b8',
};

function Pill({ map, status }: { map: Record<string, { label: string; cls: string }>; status: string }) {
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap', s.cls)}>
      {s.label}
    </span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export function ObrasDetalheModal({
  obra,
  apontamentos,
  despesas,
  onClose,
}: {
  obra: Obra;
  apontamentos: Apontamento[];
  despesas: Despesa[];
  onClose: () => void;
}) {
  // Compute derived stats
  const obraApts  = apontamentos.filter((a) => a.obra_id === obra.id);
  const obraDesps = despesas.filter((d) => d.obra_id === obra.id);

  const totalHoras = obraApts
    .filter((a) => a.status === 'aprovado')
    .reduce((s, a) => s + (a.total_horas ?? 0), 0);

  const custoAprovado = obraDesps
    .filter((d) => d.status === 'aprovada')
    .reduce((s, d) => s + Number(d.valor), 0);

  const budgetPct = obra.orcamento && obra.orcamento > 0
    ? Math.min((custoAprovado / obra.orcamento) * 100, 100)
    : null;

  const barColor = budgetPct !== null
    ? (budgetPct > 90 ? '#EF4444' : budgetPct > 70 ? '#D97706' : '#10B981')
    : (obra.progresso >= 75 ? '#3D5AFE' : obra.progresso >= 40 ? '#10B981' : '#D97706');

  const daysLeft = getDaysLeft(obra.prazo);
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isUrgent  = daysLeft !== null && daysLeft >= 0 && daysLeft < 7;

  // Tecnicos via obra_tecnicos
  const tecMap = new Map<string, { id: string; nome: string; avatar: string | null }>();
  (obra.obra_tecnicos ?? []).forEach((ot) => {
    tecMap.set(ot.tecnico.id, { id: ot.tecnico.id, nome: ot.tecnico.full_name, avatar: ot.tecnico.avatar_url ?? null });
  });
  // Supplement with apontamentos/despesas if not already present
  obraApts.forEach((a) => {
    if (a.tecnico && !tecMap.has(a.tecnico_id))
      tecMap.set(a.tecnico_id, { id: a.tecnico_id, nome: a.tecnico.full_name, avatar: a.tecnico.avatar_url ?? null });
  });
  obraDesps.forEach((d) => {
    if (d.tecnico && !tecMap.has(d.tecnico_id))
      tecMap.set(d.tecnico_id, { id: d.tecnico_id, nome: d.tecnico.full_name, avatar: (d.tecnico as any).avatar_url ?? null });
  });
  const tecnicos = [...tecMap.values()];

  // Sorted lists (newest first, limit 8)
  const recentApts  = [...obraApts].sort((a, b) => b.data_apontamento.localeCompare(a.data_apontamento)).slice(0, 8);
  const recentDesps = [...obraDesps].sort((a, b) => b.data_despesa.localeCompare(a.data_despesa)).slice(0, 8);

  const statusObra = STATUS_OBRA[obra.status] ?? STATUS_OBRA['ativa'];

  return (
    <DialogContent
      showCloseButton={false}
      className="w-[calc(100%-2rem)] max-w-lg p-0 gap-0 flex flex-col overflow-hidden rounded-2xl border border-gray-100 shadow-2xl"
      style={{ height: 'min(90vh, 700px)' }}
    >
      <DialogTitle className="sr-only">Detalhe da Obra</DialogTitle>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 px-2 py-0.5 rounded-md bg-navy/10 text-[10px] font-black tracking-widest text-navy">
              {obra.codigo}
            </span>
            <span className={cn('shrink-0 inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap', statusObra.cls)}>
              {statusObra.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-navy transition-colors"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nome + cliente */}
        <h2 className="text-[20px] font-black text-navy leading-tight mb-0.5">{obra.nome}</h2>
        {obra.cliente && (
          <p className="text-[12px] text-gray-400 font-medium">{obra.cliente}</p>
        )}

        {/* Progress bar */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Progresso</span>
            <span className="text-[12px] font-black tabular-nums" style={{ color: barColor }}>{obra.progresso}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${obra.progresso}%`, backgroundColor: barColor }}
            />
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto modal-scroll px-5 py-4 space-y-4">

        {/* Info rows */}
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          {([
            obra.prazo ? {
              icon: <CalendarDays size={14} className={isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-gray-400'} />,
              label: 'Prazo',
              value: fmtDate(obra.prazo),
              extra: isOverdue
                ? <span className="text-[10px] font-bold text-red-500">{Math.abs(daysLeft!)}d atraso</span>
                : isUrgent
                ? <span className="text-[10px] font-bold text-amber-500">{daysLeft}d restantes</span>
                : null,
            } : null,
            obra.localizacao ? {
              icon: <MapPin size={14} className="text-gray-400" />,
              label: 'Localização',
              value: obra.localizacao,
            } : null,
            obra.orcamento != null ? {
              icon: <Wallet size={14} className="text-gray-400" />,
              label: 'Orçamento',
              value: eur(obra.orcamento),
            } : null,
            custoAprovado > 0 ? {
              icon: <Receipt size={14} className={budgetPct && budgetPct > 90 ? 'text-red-400' : 'text-gray-400'} />,
              label: 'Custo aprovado',
              value: eur(custoAprovado),
              extra: budgetPct !== null
                ? <span className="text-[10px] font-bold" style={{ color: barColor }}>{Math.round(budgetPct)}%</span>
                : null,
            } : null,
            totalHoras > 0 ? {
              icon: <Clock size={14} className="text-gray-400" />,
              label: 'Horas aprovadas',
              value: fmtH(totalHoras),
            } : null,
          ] as any[]).filter(Boolean).map((row: any, i: number, arr: any[]) => (
            <div key={i} className={cn('flex items-center gap-4 px-5 py-3.5', i < arr.length - 1 && 'border-b border-gray-50')}>
              <span className="shrink-0 flex items-center justify-center w-5">{row.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">{row.label}</span>
              <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
                {row.extra}
                <span className="text-[13px] font-semibold text-navy text-right truncate">{row.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Técnicos envolvidos */}
        {tecnicos.length > 0 && (
          <div className="rounded-2xl border border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={13} className="text-gray-400 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Técnicos envolvidos ({tecnicos.length})
              </p>
            </div>
            {/* Avatar row */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex items-center shrink-0">
                {tecnicos.slice(0, 5).map((t, i) => (
                  <div
                    key={t.id}
                    title={t.nome}
                    className="w-7 h-7 rounded-full bg-navy border-2 border-white flex items-center justify-center overflow-hidden"
                    style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}
                  >
                    {t.avatar
                      ? <img src={t.avatar} alt={t.nome} className="w-full h-full object-cover" />
                      : <span className="text-[8px] font-black text-white select-none">{getInitials(t.nome)}</span>
                    }
                  </div>
                ))}
                {tecnicos.length > 5 && (
                  <div
                    className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[7px] font-black text-gray-500 select-none"
                    style={{ marginLeft: -8 }}
                  >
                    +{tecnicos.length - 5}
                  </div>
                )}
              </div>
            </div>
            {/* Name pills */}
            <div className="flex flex-wrap gap-1.5">
              {tecnicos.map((t) => (
                <span key={t.id} className="inline-flex items-center px-2.5 py-1 rounded-full bg-navy/8 border border-navy/15 text-[11px] font-semibold text-navy">
                  {t.nome.split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Apontamentos recentes */}
        {recentApts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wrench size={12} className="text-gray-400 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Apontamentos ({obraApts.length})
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {recentApts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  {/* Date badge */}
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-black text-navy tabular-nums leading-tight">
                      {new Date(a.data_apontamento + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit' })}
                    </span>
                    <span className="text-[8px] font-semibold text-gray-400 uppercase leading-tight">
                      {new Date(a.data_apontamento + 'T00:00:00').toLocaleDateString('pt-PT', { month: 'short' })}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-navy truncate leading-tight">{a.tecnico?.full_name ?? '—'}</p>
                    <p className="text-[10px] text-gray-400 truncate leading-tight">{a.tipo_servico}</p>
                  </div>
                  {/* Hours + status */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {a.total_horas != null && (
                      <span className="text-[11px] font-black text-navy tabular-nums">{fmtH(a.total_horas)}</span>
                    )}
                    <Pill map={STATUS_APT} status={a.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Despesas recentes */}
        {recentDesps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Receipt size={12} className="text-gray-400 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Despesas ({obraDesps.length})
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {recentDesps.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                  {/* Date badge */}
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-black text-navy tabular-nums leading-tight">
                      {new Date(d.data_despesa + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit' })}
                    </span>
                    <span className="text-[8px] font-semibold text-gray-400 uppercase leading-tight">
                      {new Date(d.data_despesa + 'T00:00:00').toLocaleDateString('pt-PT', { month: 'short' })}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: TIPO_DOT[d.tipo_despesa] ?? '#94a3b8' }} />
                      <p className="text-[12px] font-bold text-navy capitalize truncate leading-tight">{d.tipo_despesa}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate leading-tight pl-3.5">
                      {d.tecnico?.full_name ?? '—'}
                      {(d.despesa_participantes?.length ?? 0) > 0 && (
                        <span className="ml-1 text-indigo-400">+{d.despesa_participantes!.length} colega{d.despesa_participantes!.length > 1 ? 's' : ''}</span>
                      )}
                    </p>
                  </div>
                  {/* Valor + status */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[11px] font-black text-navy tabular-nums">{eur(Number(d.valor))}</span>
                    <Pill map={STATUS_DSP} status={d.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentApts.length === 0 && recentDesps.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Building2 size={28} className="text-gray-200" />
            <p className="text-[13px] font-semibold text-gray-400">Sem registos nesta obra</p>
          </div>
        )}

      </div>
    </DialogContent>
  );
}
