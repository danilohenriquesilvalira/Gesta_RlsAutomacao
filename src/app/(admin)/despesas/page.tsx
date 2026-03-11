'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  useDespesas, useUpdateDespesaStatus,
  useDepositos, useCreateDeposito,
} from '@/lib/queries/despesas';
import {
  useRecibosPagamento, useCreateReciboPagamento, useDeleteReciboPagamento,
} from '@/lib/queries/recibos-pagamento';
import { useTecnicos } from '@/lib/queries/tecnicos';
import { DepositoModal } from '@/components/admin/DepositoModal';
import { ReciboPagamentoModal } from '@/components/admin/ReciboPagamentoModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Wallet, TrendingDown, ArrowUpCircle,
  X, XCircle, PlusCircle, Receipt, FileText, ExternalLink, Trash2, Search,
  Check, CheckCheck, AlertCircle, CheckCircle2, ChevronRight,
  Building2, Info, ArrowLeft, CalendarDays, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Despesa, DespesaStatus, Profile } from '@/types';

/* ── helpers ──────────────────────────────────────────────────── */
function eur(n: number) {
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/80 ${className}`} />;
}

/* ── pills ────────────────────────────────────────────────────── */
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

function TipoPill({ tipo }: { tipo: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    combustível:  { label: 'Combustível',  cls: 'bg-yellow-50 text-yellow-700 border-yellow-200'   },
    alimentação:  { label: 'Alimentação',  cls: 'bg-orange-50 text-orange-600 border-orange-200'   },
    alojamento:   { label: 'Alojamento',   cls: 'bg-blue-50 text-blue-600 border-blue-200'         },
    material:     { label: 'Material',     cls: 'bg-slate-100 text-slate-600 border-slate-200'     },
    transporte:   { label: 'Transporte',   cls: 'bg-violet-50 text-violet-600 border-violet-200'   },
    outro:        { label: 'Outro',        cls: 'bg-gray-100 text-gray-500 border-gray-200'        },
  };
  const t = map[tipo] ?? { label: tipo, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap', t.cls)}>
      {t.label}
    </span>
  );
}

/* ── types ────────────────────────────────────────────────────── */
type GrupoDespesas = {
  tecnicoId: string;
  tecnico: Despesa['tecnico'];
  desps: Despesa[];
  pendentes: number;
  aprovadas: number;
  rejeitadas: number;
  totalAprovado: number;
};

type ModalTab = 'pendentes' | 'aprovadas' | 'rejeitadas' | 'todas';

/* ── TecnicoDespesasModal ─────────────────────────────────────── */
function TecnicoDespesasModal({
  grupo,
  onClose,
  onAprovar,
  onRejeitar,
  busy,
}: {
  grupo: GrupoDespesas;
  onClose: () => void;
  onAprovar: (id: string) => void;
  onRejeitar: (ids: string[]) => void;
  busy: boolean;
}) {
  const [tab, setTab] = useState<ModalTab>(grupo.pendentes > 0 ? 'pendentes' : 'todas');
  const [viewDesp, setViewDesp] = useState<Despesa | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const tabs: { key: ModalTab; label: string; count: number }[] = [
    { key: 'pendentes',  label: 'Pendentes',  count: grupo.pendentes   },
    { key: 'aprovadas',  label: 'Aprovadas',  count: grupo.aprovadas   },
    { key: 'rejeitadas', label: 'Rejeitadas', count: grupo.rejeitadas  },
    { key: 'todas',      label: 'Todas',      count: grupo.desps.length },
  ];

  const filteredDesps = useMemo(() => {
    const statusMap: Record<ModalTab, string | null> = {
      pendentes: 'pendente', aprovadas: 'aprovada', rejeitadas: 'rejeitada', todas: null,
    };
    const st = statusMap[tab];
    const filtered = st ? grupo.desps.filter(d => d.status === st) : grupo.desps;
    return [...filtered].sort((a, b) => {
      if (a.status === 'pendente' && b.status !== 'pendente') return -1;
      if (a.status !== 'pendente' && b.status === 'pendente') return 1;
      return b.data_despesa.localeCompare(a.data_despesa);
    });
  }, [grupo.desps, tab]);

  const pendingInView = filteredDesps.filter(d => d.status === 'pendente');
  const selectedSet = new Set(selectedIds);
  const allSelected = pendingInView.length > 0 && pendingInView.every(d => selectedSet.has(d.id));

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleAll() {
    const ids = pendingInView.map(d => d.id);
    setSelectedIds(allSelected ? [] : ids);
  }

  return (
    <>
      <DialogContent
        className="fixed inset-0 translate-x-0 translate-y-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:translate-x-[-50%] sm:translate-y-[-50%] w-full sm:max-w-2xl h-full sm:h-[72vh] p-0 gap-0 flex flex-col overflow-hidden border-0 rounded-none sm:shadow-2xl sm:border sm:border-gray-100 sm:rounded-2xl"
      >
        {/* wrapper relativo para o painel de detalhe funcionar */}
        <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* ════ HEADER ════ */}
        <div className="shrink-0 bg-white relative z-10">

          {/* Avatar + nome + stats + fechar */}
          <div className="flex items-center gap-3 px-5 pt-4 pb-3">
            <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-gray-100">
              {grupo.tecnico?.avatar_url
                ? <img src={grupo.tecnico.avatar_url} alt={grupo.tecnico.full_name} className="w-full h-full object-cover" />
                : <span className="text-[11px] font-black text-white">{grupo.tecnico ? getInitials(grupo.tecnico.full_name) : '??'}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-[15px] font-black text-navy leading-none truncate">
                {grupo.tecnico?.full_name || 'Técnico'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[11px] text-gray-400">{grupo.desps.length} despesa{grupo.desps.length !== 1 ? 's' : ''}</span>
                {grupo.totalAprovado > 0 && (
                  <>
                    <span className="text-gray-200 select-none">·</span>
                    <span className="text-[11px] font-semibold text-navy">{eur(grupo.totalAprovado)} aprov.</span>
                  </>
                )}
                {grupo.pendentes > 0 && (
                  <>
                    <span className="text-gray-200 select-none">·</span>
                    <span className="text-[11px] font-semibold text-amber-500">{grupo.pendentes} pendente{grupo.pendentes !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-navy transition-colors"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab bar */}
          <div className={cn('flex gap-0 px-4 border-t border-gray-100 overflow-x-auto', viewDesp ? 'hidden' : '')}>
            {tabs.filter(t => t.count > 0 || t.key === 'todas').map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelectedIds([]); }}
                className={cn(
                  'relative flex items-center gap-1.5 h-10 px-3 sm:px-4 text-[12px] font-bold transition-colors whitespace-nowrap shrink-0',
                  tab === t.key
                    ? t.key === 'pendentes' ? 'text-amber-600' : 'text-navy'
                    : 'text-gray-400 hover:text-gray-700'
                )}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={cn(
                    'text-[9px] font-black px-1.5 min-w-[18px] text-center py-0.5 rounded-full',
                    tab === t.key
                      ? t.key === 'pendentes' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                      : 'bg-gray-100 text-gray-400'
                  )}>
                    {t.count}
                  </span>
                )}
                {tab === t.key && (
                  <span className={cn(
                    'absolute bottom-0 inset-x-0 h-[2px] rounded-t-full',
                    t.key === 'pendentes' ? 'bg-amber-500' : 'bg-navy'
                  )} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ════ BATCH BAR ════ */}
        {!viewDesp && selectedIds.length > 0 && (
          <div className="shrink-0 px-5 py-2.5 bg-slate-50 border-y border-slate-100 flex items-center gap-3">
            <input
              type="checkbox" checked={allSelected} onChange={toggleAll}
              className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer shrink-0"
            />
            <span className="text-[12px] font-semibold text-navy">{selectedIds.length} selecionada{selectedIds.length > 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <button
                onClick={() => { selectedIds.forEach(id => onAprovar(id)); setSelectedIds([]); }}
                disabled={busy}
                className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-navy text-white text-[11px] font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-40"
              >
                <CheckCheck size={11} /> Aprovar {selectedIds.length}
              </button>
              <button
                onClick={() => { onRejeitar(selectedIds); setSelectedIds([]); }}
                disabled={busy}
                className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-red-200 text-red-500 text-[11px] font-bold hover:bg-red-500 hover:text-white hover:border-transparent transition-all disabled:opacity-40"
              >
                <X size={11} /> Rejeitar
              </button>
            </div>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-[11px] text-gray-400 hover:text-navy transition-colors">Limpar</button>
          </div>
        )}

        {/* ════ LISTA ════ */}
        <div className="flex-1 overflow-y-auto modal-scroll">
          {filteredDesps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <CheckCircle2 size={22} className="text-gray-200" />
              </div>
              <p className="text-[14px] font-semibold text-navy">Nenhuma despesa aqui</p>
              <p className="text-[12px] text-gray-400">Sem despesas nesta categoria</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-border/40">
              {filteredDesps.map(desp => {
                const isPending = desp.status === 'pendente';
                const isSelected = selectedSet.has(desp.id);
                return (
                  <div
                    key={desp.id}
                    onClick={() => setViewDesp(desp)}
                    className={cn(
                      'relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-bg/30',
                      isSelected && 'bg-blue-50/40',
                      isPending && !isSelected && 'bg-amber-50/20'
                    )}
                  >
                    {/* Faixa lateral pendente */}
                    {isPending && <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full bg-amber-400" />}

                    {/* Checkbox */}
                    <div className="shrink-0" onClick={e => e.stopPropagation()}>
                      {isPending ? (
                        <input
                          type="checkbox" checked={isSelected} onChange={() => toggleSelect(desp.id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer"
                        />
                      ) : (
                        <span className="block w-3.5" />
                      )}
                    </div>

                    {/* Date badge */}
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center">
                      <span className="text-[12px] font-black text-navy tabular-nums leading-tight">
                        {fmtDate(desp.data_despesa).split(' ')[0]}
                      </span>
                      <span className="text-[9px] font-semibold text-gray-400 uppercase leading-tight">
                        {fmtDate(desp.data_despesa).split(' ')[1]}
                      </span>
                    </div>

                    {/* Tipo + Obra — centrado no espaço disponível */}
                    <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
                      <TipoPill tipo={desp.tipo_despesa} />
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-[10px] text-gray-400 truncate leading-tight">
                          {desp.obra?.nome || desp.descricao || '—'}
                        </p>
                        {desp.obra?.codigo && (
                          <span className="shrink-0 text-[9px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md tabular-nums">
                            {desp.obra.codigo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Valor */}
                    <div className="shrink-0 text-right">
                      <span className="font-mono text-[13px] font-black text-navy tabular-nums">
                        {eur(Number(desp.valor))}
                      </span>
                    </div>

                    {/* Status + ações */}
                    <div className="shrink-0 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <StatusPill status={desp.status} nota={desp.nota_rejeicao} />
                      {(desp.recibos?.length ?? 0) > 0 && (
                        <span title={`${desp.recibos!.length} recibo(s)`} className="w-7 h-7 rounded-full border border-gray-border text-gray-muted flex items-center justify-center shrink-0">
                          <FileText size={12} />
                        </span>
                      )}
                      {isPending && (
                        <>
                          <button
                            onClick={() => onAprovar(desp.id)}
                            disabled={busy}
                            title="Aprovar"
                            className="w-7 h-7 rounded-full border border-gray-border text-gray-muted hover:border-success hover:text-success hover:bg-success/8 disabled:opacity-40 flex items-center justify-center transition-all"
                          >
                            <CheckCircle2 size={13} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => onRejeitar([desp.id])}
                            disabled={busy}
                            title="Rejeitar"
                            className="w-7 h-7 rounded-full border border-gray-border text-gray-muted hover:border-error hover:text-error hover:bg-error/8 disabled:opacity-40 flex items-center justify-center transition-all"
                          >
                            <XCircle size={13} strokeWidth={2} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ════ PAINEL DE DETALHE — inline, sem dialog sobre dialog ════ */}
        {viewDesp && (
          <div className="absolute inset-0 flex flex-col bg-white z-20 animate-in slide-in-from-right-8 duration-200">

            {/* Cabeçalho do detalhe */}
            <div className="shrink-0 px-5 pt-4 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setViewDesp(null)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-gray-50 border border-gray-100 text-[12px] font-bold text-gray-500 hover:text-navy hover:border-gray-200 transition-colors"
                >
                  <ArrowLeft size={13} /> Voltar
                </button>
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
                    {eur(Number(viewDesp.valor))}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {new Date(viewDesp.data_despesa + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <StatusPill status={viewDesp.status} nota={viewDesp.nota_rejeicao} />
              </div>
            </div>

            {/* Corpo */}
            <div className="flex-1 overflow-y-auto modal-scroll px-6 py-5 space-y-3">
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                {([
                  { label: 'Tipo',      value: viewDesp.tipo_despesa,  icon: <Receipt size={14} className="text-gray-400" /> },
                  { label: 'Data',      value: new Date(viewDesp.data_despesa + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }), icon: <CalendarDays size={14} className="text-gray-400" /> },
                  { label: 'Obra',      value: viewDesp.obra?.nome ?? '—', icon: <Building2 size={14} className="text-gray-400" /> },
                  ...(viewDesp.obra?.codigo ? [{ label: 'Cód. Obra', value: viewDesp.obra.codigo, icon: <Hash size={14} className="text-gray-400" /> }] : []),
                  ...(viewDesp.descricao ? [{ label: 'Descrição', value: viewDesp.descricao, icon: <Info size={14} className="text-gray-400" /> }] : []),
                ] as { label: string; value: string; icon: React.ReactNode }[]).map((row, i, arr) => (
                  <div key={i} className={cn('flex items-center gap-4 px-5 py-3.5', i < arr.length - 1 && 'border-b border-gray-50')}>
                    <span className="shrink-0 flex items-center justify-center w-5">{row.icon}</span>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">{row.label}</span>
                      <span className="text-[13px] font-semibold text-navy text-right truncate">{row.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {viewDesp.status === 'rejeitada' && viewDesp.nota_rejeicao && (
                <div className="rounded-2xl border border-red-100 bg-red-50/50 px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1.5">Motivo da Rejeição</p>
                  <p className="text-[13px] text-red-700 leading-relaxed">{viewDesp.nota_rejeicao}</p>
                </div>
              )}

              {(viewDesp.recibos?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">
                    Recibos ({viewDesp.recibos!.length})
                  </p>
                  <div className="flex flex-col gap-2">
                    {viewDesp.recibos!.map((r, i) => (
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

            {/* Rodapé com ações (só se pendente) */}
            {viewDesp.status === 'pendente' && (
              <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => { onAprovar(viewDesp.id); setViewDesp(null); }}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-navy text-white text-[13px] font-bold hover:opacity-90 transition-all disabled:opacity-40 shadow-sm"
                >
                  <CheckCircle2 size={15} strokeWidth={2} /> Aprovar
                </button>
                <button
                  onClick={() => { onRejeitar([viewDesp.id]); setViewDesp(null); }}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-red-200 text-red-500 text-[13px] font-bold hover:bg-red-500 hover:text-white hover:border-transparent transition-all disabled:opacity-40"
                >
                  <XCircle size={15} strokeWidth={2} /> Rejeitar
                </button>
              </div>
            )}
          </div>
        )}

        </div>
      </DialogContent>
    </>
  );
}

/* ══ PÁGINA PRINCIPAL ════════════════════════════════════════════ */
export default function AdminDespesasPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'despesas' | 'saldo' | 'recibos'>('despesas');

  // Despesas tab state
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoDespesas | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; ids: string[]; nota: string }>({
    open: false, ids: [], nota: '',
  });
  const [rejectPending, setRejectPending] = useState(false);

  // Deposito modal
  const [depositoOpen, setDepositoOpen] = useState(false);
  const [depositoTecnicoId, setDepositoTecnicoId] = useState<string | undefined>();

  // Recibos de pagamento
  const [reciboOpen, setReciboOpen]           = useState(false);
  const [filterReciboTecnico, setFilterReciboTecnico] = useState('');
  const [reciboSearch, setReciboSearch]       = useState('');
  const [deletingRecibo, setDeletingRecibo]   = useState<{ id: string; storagePath: string } | null>(null);

  // ── Data ────────────────────────────────────────────────────────
  const { data: todasDespesas = [], isLoading: lDesp } = useDespesas();
  const { data: depositos = [], isLoading: lDep } = useDepositos();
  const { data: tecnicos = [] } = useTecnicos();
  const { data: todosRecibos = [], isLoading: lRecibos } = useRecibosPagamento();

  const updateStatus = useUpdateDespesaStatus();
  const createDeposito = useCreateDeposito();
  const createRecibo = useCreateReciboPagamento();
  const deleteRecibo = useDeleteReciboPagamento();

  const busy = updateStatus.isPending;
  const tecnicosTecnico = tecnicos.filter(t => t.role === 'tecnico') as Profile[];

  // ── Agrupamento por técnico ──────────────────────────────────────
  const grupos = useMemo<GrupoDespesas[]>(() => {
    const map = new Map<string, GrupoDespesas>();
    for (const d of todasDespesas) {
      if (!map.has(d.tecnico_id)) {
        map.set(d.tecnico_id, {
          tecnicoId: d.tecnico_id,
          tecnico: d.tecnico,
          desps: [],
          pendentes: 0, aprovadas: 0, rejeitadas: 0,
          totalAprovado: 0,
        });
      }
      const g = map.get(d.tecnico_id)!;
      g.desps.push(d);
      if (d.status === 'pendente')  g.pendentes++;
      if (d.status === 'aprovada')  { g.aprovadas++; g.totalAprovado += Number(d.valor); }
      if (d.status === 'rejeitada') g.rejeitadas++;
    }
    return Array.from(map.values())
      .sort((a, b) => b.pendentes - a.pendentes || b.totalAprovado - a.totalAprovado);
  }, [todasDespesas]);

  // ── Stats globais (despesas tab) ─────────────────────────────────
  const stats = useMemo(() => ({
    total: todasDespesas.length,
    pendentes: todasDespesas.filter(d => d.status === 'pendente').length,
    totalAprovado: todasDespesas.filter(d => d.status === 'aprovada').reduce((s, d) => s + Number(d.valor), 0),
  }), [todasDespesas]);

  // ── Saldo por técnico ────────────────────────────────────────────
  const tecnicosSaldo = useMemo(() =>
    tecnicosTecnico.map(tec => {
      const deps = depositos.filter(d => d.tecnico_id === tec.id);
      const desps = todasDespesas.filter(d => d.tecnico_id === tec.id && d.status === 'aprovada');
      const totalDep = deps.reduce((s, d) => s + Number(d.valor), 0);
      const totalGasto = desps.reduce((s, d) => s + Number(d.valor), 0);
      return { tec, totalDep, totalGasto, saldo: totalDep - totalGasto };
    }).sort((a, b) => b.saldo - a.saldo),
    [tecnicosTecnico, depositos, todasDespesas]
  );

  const saldoGlobal = useMemo(() => {
    const totalDep = depositos.reduce((s, d) => s + Number(d.valor), 0);
    const totalGasto = todasDespesas.filter(d => d.status === 'aprovada').reduce((s, d) => s + Number(d.valor), 0);
    return { totalDep, totalGasto, saldo: totalDep - totalGasto };
  }, [depositos, todasDespesas]);

  const isSaldoLoading = lDesp || lDep;

  // ── Handlers ────────────────────────────────────────────────────
  async function handleAprovar(id: string) {
    try {
      await updateStatus.mutateAsync({ id, status: 'aprovada' });
      toast.success('Despesa aprovada');
    } catch { toast.error('Erro ao aprovar'); }
  }

  function handleRejeitar(ids: string[]) {
    setRejectDialog({ open: true, ids, nota: '' });
  }

  async function handleConfirmRejeitar() {
    const { ids, nota } = rejectDialog;
    setRejectPending(true);
    try {
      await Promise.all(ids.map(id => updateStatus.mutateAsync({ id, status: 'rejeitada', nota_rejeicao: nota.trim() || null })));
      toast.success(`${ids.length} despesa(s) rejeitada(s)`);
      setRejectDialog({ open: false, ids: [], nota: '' });
    } catch { toast.error('Erro ao rejeitar'); }
    finally { setRejectPending(false); }
  }

  async function handleCreateDeposito(data: {
    tecnico_id: string; valor: number; data_deposito: string; descricao?: string;
  }) {
    if (!profile) return;
    try {
      await createDeposito.mutateAsync({ ...data, admin_id: profile.id });
      toast.success('Depósito registado com sucesso!');
      setDepositoOpen(false);
      setDepositoTecnicoId(undefined);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registar depósito');
    }
  }

  const openDeposito = (tecnicoId?: string) => {
    setDepositoTecnicoId(tecnicoId);
    setDepositoOpen(true);
  };

  async function handleCreateRecibo(data: {
    tecnico_id: string; periodo: string; valor_bruto: number;
    valor_liquido?: number | null; descricao?: string; file: File;
  }) {
    if (!profile) return;
    try {
      await createRecibo.mutateAsync({ ...data, admin_id: profile.id });
      toast.success('Recibo carregado com sucesso!');
      setReciboOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar recibo');
    }
  }

  async function handleDeleteRecibo() {
    if (!deletingRecibo) return;
    try {
      await deleteRecibo.mutateAsync(deletingRecibo);
      toast.success('Recibo eliminado');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao eliminar recibo');
    } finally {
      setDeletingRecibo(null);
    }
  }

  const filteredRecibos = todosRecibos.filter(r => {
    if (filterReciboTecnico && r.tecnico_id !== filterReciboTecnico) return false;
    if (reciboSearch) {
      const q = reciboSearch.toLowerCase();
      return r.periodo.toLowerCase().includes(q) || (r.tecnico?.full_name ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-3 lg:overflow-hidden">

      {/* ── Título ── */}
      <div className="shrink-0">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Administração</p>
        <h1 className="text-xl font-black text-navy tracking-tight">Despesas</h1>
      </div>

      {/* ── Toolbar ── */}
      <div className="shrink-0 flex items-center justify-between gap-3 pb-3 border-b border-gray-border/60">

        {/* Abas */}
        <div className="flex gap-1 bg-white border border-gray-border rounded-xl p-1 shadow-sm">
          {([
            { key: 'despesas', desktop: 'Despesas',            mobile: 'Despesas' },
            { key: 'saldo',    desktop: 'Depósitos & Saldo',   mobile: 'Saldo'    },
            { key: 'recibos',  desktop: 'Recibos de Ordenado', mobile: 'Recibos'  },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'h-8 px-3 sm:px-4 rounded-lg text-[11px] sm:text-[12px] font-bold transition-all whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-gray-muted hover:text-navy'
              )}
            >
              <span className="sm:hidden">{tab.mobile}</span>
              <span className="hidden sm:inline">{tab.desktop}</span>
            </button>
          ))}
        </div>

        {/* Botão acção */}
        {activeTab === 'recibos' ? (
          <button
            onClick={() => setReciboOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 sm:px-4 rounded-xl bg-navy text-white text-[11px] sm:text-[12px] font-bold hover:bg-navy-light transition-colors shadow-sm shadow-navy/20 whitespace-nowrap"
          >
            <Receipt size={13} />
            <span className="hidden sm:inline">Carregar Recibo</span>
            <span className="sm:hidden">Recibo</span>
          </button>
        ) : (
          <button
            onClick={() => openDeposito()}
            className="flex items-center gap-1.5 h-8 px-3 sm:px-4 rounded-xl bg-navy text-white text-[11px] sm:text-[12px] font-bold hover:bg-navy-light transition-colors shadow-sm shadow-navy/20 whitespace-nowrap"
          >
            <PlusCircle size={13} />
            <span className="hidden sm:inline">Registar Depósito</span>
            <span className="sm:hidden">Depósito</span>
          </button>
        )}
      </div>

      {/* ══ TAB: DESPESAS ══════════════════════════════════════════ */}
      {activeTab === 'despesas' && (
        <>
          {/* Stats pills */}
          <div className="shrink-0 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
              {lDesp ? '—' : stats.total} despesas
            </div>
            {!lDesp && stats.totalAprovado > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
                {eur(stats.totalAprovado)} aprovado
              </div>
            )}
            {!lDesp && stats.pendentes > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-700">
                <AlertCircle size={11} className="shrink-0" />
                {stats.pendentes} pendentes
              </div>
            )}
            {!lDesp && stats.pendentes === 0 && stats.total > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600">
                <CheckCircle2 size={11} className="shrink-0" />
                Tudo em dia
              </div>
            )}
          </div>

          {/* Card lista de técnicos */}
          <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden flex flex-col">

            {/* Cabeçalho lista */}
            <div className="shrink-0 flex items-center px-5 h-10 border-b border-gray-border/60 bg-gray-bg/60">
              <span className="flex-1 text-[9px] font-black uppercase tracking-widest text-gray-muted">Funcionário</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-muted hidden sm:block w-[120px] text-center">Total aprovado</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-muted w-[100px] text-right">Estado</span>
              <span className="w-6 shrink-0" />
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* Loading */}
              {lDesp && (
                <div className="divide-y divide-gray-border/40">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <Sk className="w-10 h-10 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Sk className="h-3.5 w-40" />
                        <Sk className="h-2.5 w-24" />
                      </div>
                      <Sk className="w-[90px] h-6 rounded-full hidden sm:block" />
                      <Sk className="w-[80px] h-6 rounded-full" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty */}
              {!lDesp && grupos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Wallet size={22} className="text-gray-muted/40" />
                  </div>
                  <p className="text-[13px] font-semibold text-navy">Sem despesas registadas</p>
                  <p className="text-[11px] text-gray-muted">As despesas aparecerão aqui quando forem submetidas</p>
                </div>
              )}

              {/* Lista de técnicos */}
              {!lDesp && grupos.map(grupo => (
                <div
                  key={grupo.tecnicoId}
                  onClick={() => setSelectedGrupo(grupo)}
                  className={cn(
                    'group flex items-center gap-4 px-5 py-4 border-b border-gray-border/40 cursor-pointer hover:bg-gray-bg/50 transition-colors',
                    grupo.pendentes > 0 && 'border-l-[3px] border-l-amber-400 pl-[17px]'
                  )}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white shadow-sm">
                    {grupo.tecnico?.avatar_url
                      ? <img src={grupo.tecnico.avatar_url} alt={grupo.tecnico.full_name} className="w-full h-full object-cover" />
                      : <span className="text-[11px] font-black text-white">{grupo.tecnico ? getInitials(grupo.tecnico.full_name) : '??'}</span>
                    }
                  </div>

                  {/* Nome + subtítulo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-navy leading-tight">
                      {grupo.tecnico?.full_name || 'Técnico desconhecido'}
                    </p>
                    <p className="text-[10px] text-gray-muted mt-0.5">
                      {grupo.desps.length} despesa{grupo.desps.length !== 1 ? 's' : ''}
                      {grupo.rejeitadas > 0 && (
                        <span className="text-red-400 ml-1.5">· {grupo.rejeitadas} rejeitada{grupo.rejeitadas !== 1 ? 's' : ''}</span>
                      )}
                    </p>
                  </div>

                  {/* Total aprovado */}
                  <div className="hidden sm:flex items-center w-[120px] justify-center shrink-0">
                    {grupo.totalAprovado > 0 ? (
                      <span className="text-[12px] font-black text-navy tabular-nums">{eur(grupo.totalAprovado)}</span>
                    ) : (
                      <span className="text-[11px] text-gray-muted">—</span>
                    )}
                  </div>

                  {/* Badge */}
                  <div className="w-[100px] flex justify-end shrink-0">
                    {grupo.pendentes > 0 ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-black text-amber-700 whitespace-nowrap">
                        <AlertCircle size={9} />
                        {grupo.pendentes} pendente{grupo.pendentes !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-500">
                        <CheckCircle2 size={9} />
                        Em dia
                      </span>
                    )}
                  </div>

                  <ChevronRight size={15} className="text-gray-muted shrink-0 group-hover:text-navy transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══ TAB: DEPÓSITOS & SALDO ════════════════════════════════ */}
      {activeTab === 'saldo' && (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">

          {/* KPIs globais */}
          <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              {
                label: 'Total Depositado',
                value: isSaldoLoading ? '—' : eur(saldoGlobal.totalDep),
                icon: <ArrowUpCircle size={13} />,
                accent: 'bg-success', iconBg: 'bg-emerald-50 text-success',
                cls: 'text-navy',
              },
              {
                label: 'Total Gasto (Aprovado)',
                value: isSaldoLoading ? '—' : eur(saldoGlobal.totalGasto),
                icon: <TrendingDown size={13} />,
                accent: 'bg-error', iconBg: 'bg-red-50 text-error',
                cls: 'text-navy',
              },
              {
                label: 'Saldo Global',
                value: isSaldoLoading ? '—' : (saldoGlobal.saldo >= 0 ? '+' : '') + eur(saldoGlobal.saldo),
                icon: <Wallet size={13} />,
                accent: !isSaldoLoading && saldoGlobal.saldo < 0 ? 'bg-error' : 'bg-success',
                iconBg: !isSaldoLoading && saldoGlobal.saldo < 0 ? 'bg-red-50 text-error' : 'bg-emerald-50 text-success',
                cls: !isSaldoLoading && saldoGlobal.saldo < 0 ? 'text-error' : 'text-success',
              },
            ]).map((k, i) => (
              <div key={i} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${k.accent}`} />
                <div className="pl-4 pr-3 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">{k.label}</p>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${k.iconBg}`}>{k.icon}</div>
                  </div>
                  <p className={`text-[15px] font-black leading-none tabular-nums ${k.cls}`}>{k.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Cards por técnico */}
          {isSaldoLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gray-200" />
                  <div className="pl-5 pr-4 pt-4 pb-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <Sk className="h-9 w-9 rounded-full shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Sk className="h-3.5 w-28" />
                        <Sk className="h-2.5 w-16" />
                      </div>
                    </div>
                    <div className="border-t border-gray-border/70 pt-2.5 grid grid-cols-3 gap-2">
                      {[0, 1, 2].map(j => (
                        <div key={j} className="space-y-1 text-center">
                          <Sk className="h-2.5 w-14 mx-auto" />
                          <Sk className="h-4 w-16 mx-auto" />
                        </div>
                      ))}
                    </div>
                    <Sk className="h-1.5 w-full rounded-full" />
                    <Sk className="h-8 w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : tecnicosSaldo.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Wallet size={22} className="text-gray-muted/50" />
              </div>
              <p className="text-sm font-bold text-navy">Sem dados de saldo</p>
              <p className="text-[12px] text-gray-muted mt-1">Registe depósitos para os funcionários</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {tecnicosSaldo.map(({ tec, totalDep, totalGasto, saldo }) => {
                const pctGasto = totalDep > 0 ? Math.min((totalGasto / totalDep) * 100, 100) : 0;
                const barColor = saldo > 0 ? 'bg-success' : saldo < 0 ? 'bg-error' : 'bg-gray-300';
                const progColor = pctGasto >= 90 ? '#FF1744' : pctGasto >= 70 ? '#FF9100' : '#00E676';

                return (
                  <div key={tec.id} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', barColor)} />
                    <div className="pl-5 pr-4 pt-4 pb-3">

                      {/* Avatar + nome */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-navy/10 ring-offset-1 ring-offset-white">
                          {tec.avatar_url
                            ? <img src={tec.avatar_url} alt={tec.full_name} className="w-full h-full object-cover object-center" />
                            : <span className="text-[10px] font-black text-white">{getInitials(tec.full_name)}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-navy leading-tight truncate">{tec.full_name}</p>
                          <p className="text-[10px] text-gray-muted">{tec.role === 'admin' ? 'Administrador' : 'Funcionário'}</p>
                        </div>
                        <span className={cn(
                          'ml-auto shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-black',
                          saldo > 0 ? 'bg-success/10 border-success/25 text-success'
                            : saldo < 0 ? 'bg-error/10 border-error/20 text-error'
                              : 'bg-gray-100 border-gray-200 text-gray-400'
                        )}>
                          {saldo > 0 ? 'Saldo +' : saldo < 0 ? 'Saldo −' : 'Zerado'}
                        </span>
                      </div>

                      {/* Stats: 3 colunas */}
                      <div className="border-t border-gray-border/70 pt-2.5 pb-2 grid grid-cols-3 divide-x divide-gray-border/60 text-center">
                        <div className="pr-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Depositado</p>
                          <p className="text-[12px] font-black text-success tabular-nums leading-tight">{eur(totalDep)}</p>
                        </div>
                        <div className="px-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Gasto</p>
                          <p className="text-[12px] font-black text-error tabular-nums leading-tight">{eur(totalGasto)}</p>
                        </div>
                        <div className="pl-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Saldo</p>
                          <p className={cn('text-[12px] font-black tabular-nums leading-tight', saldo >= 0 ? 'text-success' : 'text-error')}>
                            {saldo >= 0 ? '+' : ''}{eur(saldo)}
                          </p>
                        </div>
                      </div>

                      {/* Barra de utilização */}
                      {totalDep > 0 && (
                        <div className="mt-2 mb-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[9px] text-gray-muted font-semibold">Utilização do fundo</p>
                            <p className={cn('text-[9px] font-black', pctGasto >= 90 ? 'text-error' : pctGasto >= 70 ? 'text-warning' : 'text-gray-muted')}>
                              {Math.round(pctGasto)}%
                            </p>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pctGasto, 100)}%`, backgroundColor: progColor }} />
                          </div>
                        </div>
                      )}

                      {/* Acção */}
                      <div className="border-t border-gray-border/70 mt-3 pt-2.5">
                        <button
                          onClick={() => openDeposito(tec.id)}
                          className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-gray-100 border border-gray-200 text-[12px] font-semibold text-navy hover:bg-navy hover:text-white hover:border-transparent transition-all"
                        >
                          <PlusCircle size={12} />
                          Registar Depósito
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: RECIBOS DE ORDENADO ══════════════════════════════ */}
      {activeTab === 'recibos' && (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">

          {/* Filtros */}
          <div className="shrink-0 bg-white rounded-xl border border-gray-border shadow-sm px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">

              <div className="flex-1 min-w-[150px] space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Funcionário</p>
                <select
                  value={filterReciboTecnico || ''}
                  onChange={e => setFilterReciboTecnico(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-border text-[13px] text-gray-text bg-white focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30"
                >
                  <option value="">Todos</option>
                  {tecnicosTecnico.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[160px] space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Pesquisar</p>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Período ou funcionário..."
                    value={reciboSearch}
                    onChange={e => setReciboSearch(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-border text-[13px] text-gray-text placeholder:text-gray-muted/50 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30 transition-all"
                  />
                </div>
              </div>

              {(filterReciboTecnico || reciboSearch) && (
                <button
                  onClick={() => { setFilterReciboTecnico(''); setReciboSearch(''); }}
                  className="flex items-center gap-1.5 h-9 px-3 self-end rounded-lg border border-gray-border text-[12px] font-semibold text-gray-muted hover:text-error hover:border-error/30 hover:bg-red-50 transition-colors"
                >
                  <X size={12} /> Limpar
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          {lRecibos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-gray-border/60 h-[100px]" />
              ))}
            </div>
          ) : filteredRecibos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Receipt size={22} className="text-gray-muted/50" />
              </div>
              <p className="text-sm font-bold text-navy">
                {todosRecibos.length === 0 ? 'Sem recibos carregados' : 'Nenhum resultado'}
              </p>
              <p className="text-[12px] text-gray-muted mt-1">
                {todosRecibos.length === 0
                  ? 'Carregue o primeiro recibo com o botão acima'
                  : 'Tente outros filtros de pesquisa'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredRecibos.map(recibo => {
                const tec = recibo.tecnico;
                return (
                  <div key={recibo.id} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-success" />
                    <div className="pl-5 pr-4 pt-4 pb-3">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-red-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-navy leading-tight">{recibo.periodo}</p>
                          {tec && <p className="text-[11px] text-gray-muted mt-0.5">{tec.full_name}</p>}
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-success/10 border border-success/25 text-[9px] font-black text-success">
                          Pago
                        </span>
                      </div>
                      <div className="border-t border-gray-border/70 pt-2.5 pb-2 grid grid-cols-2 divide-x divide-gray-border/60 text-center">
                        <div className="pr-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Bruto</p>
                          <p className="text-[12px] font-black text-navy tabular-nums">{eur(Number(recibo.valor_bruto))}</p>
                        </div>
                        <div className="pl-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Líquido</p>
                          <p className="text-[12px] font-black text-success tabular-nums">
                            {recibo.valor_liquido != null ? eur(Number(recibo.valor_liquido)) : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="border-t border-gray-border/70 mt-3 pt-2.5 flex items-center gap-2">
                        <p className="text-[10px] text-gray-muted flex-1">
                          {new Date(recibo.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <a
                          href={recibo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5 text-[12px] font-semibold"
                        >
                          <ExternalLink size={12} />
                          Abrir
                        </a>
                        <button
                          onClick={() => setDeletingRecibo({ id: recibo.id, storagePath: recibo.storage_path })}
                          className="h-8 w-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                          title="Eliminar recibo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal de detalhe do técnico (despesas) ─────────────── */}
      <Dialog open={!!selectedGrupo} onOpenChange={o => !o && setSelectedGrupo(null)}>
        {selectedGrupo && (
          <TecnicoDespesasModal
            grupo={selectedGrupo}
            onClose={() => setSelectedGrupo(null)}
            onAprovar={handleAprovar}
            onRejeitar={handleRejeitar}
            busy={busy}
          />
        )}
      </Dialog>

      {/* ── Dialog de rejeição ─────────────────────────────────── */}
      <Dialog open={rejectDialog.open} onOpenChange={o => !o && setRejectDialog({ open: false, ids: [], nota: '' })}>
        <DialogContent className="max-w-md rounded-2xl p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-gray-border/60">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Confirmação</p>
              <DialogTitle className="text-navy font-black text-[16px] tracking-tight mt-0.5">
                Rejeitar {rejectDialog.ids.length > 1 ? `${rejectDialog.ids.length} Despesas` : 'Despesa'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-5 py-4 space-y-3">
            <p className="text-[12px] text-gray-muted">
              Indique o motivo da rejeição (opcional). O técnico poderá ver esta nota.
            </p>
            <textarea
              value={rejectDialog.nota}
              onChange={e => setRejectDialog(p => ({ ...p, nota: e.target.value }))}
              placeholder="Ex: Recibo ilegível, valor incorrecto..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-border bg-gray-bg text-[13px] text-gray-text placeholder:text-gray-muted/50 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/25 resize-none transition-all"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setRejectDialog({ open: false, ids: [], nota: '' })}
                className="flex-1 h-10 rounded-xl border border-gray-border text-[13px] font-semibold text-gray-text hover:bg-gray-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRejeitar}
                disabled={rejectPending}
                className="flex-1 h-10 rounded-xl bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {rejectPending ? 'A rejeitar...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal Recibo de Pagamento ─────────────────────────── */}
      <ReciboPagamentoModal
        open={reciboOpen}
        onClose={() => setReciboOpen(false)}
        tecnicos={tecnicosTecnico}
        onSubmit={handleCreateRecibo}
        isSubmitting={createRecibo.isPending}
      />

      {/* Confirm eliminar recibo */}
      <ConfirmDialog
        open={!!deletingRecibo}
        onOpenChange={o => { if (!o) setDeletingRecibo(null); }}
        title="Eliminar Recibo"
        description="Tem a certeza que deseja eliminar este recibo de ordenado? O ficheiro PDF será removido permanentemente."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteRecibo}
        isLoading={deleteRecibo.isPending}
        variant="danger"
      />

      {/* ── Modal Depósito ────────────────────────────────────── */}
      <DepositoModal
        key={depositoTecnicoId ?? 'global'}
        open={depositoOpen}
        onClose={() => { setDepositoOpen(false); setDepositoTecnicoId(undefined); }}
        tecnicos={tecnicosTecnico}
        onSubmit={handleCreateDeposito}
        isSubmitting={createDeposito.isPending}
        defaultTecnicoId={depositoTecnicoId}
      />
    </div>
  );
}
