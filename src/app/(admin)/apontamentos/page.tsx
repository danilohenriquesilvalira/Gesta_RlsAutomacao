'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useApontamentos, useUpdateApontamentoStatus } from '@/lib/queries/apontamentos';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Check, X, Camera, Info, Clock, AlertCircle,
  CheckCircle2, XCircle, ClipboardList, ChevronRight,
  CheckCheck, Building2, Wrench, LogIn, LogOut, Timer, ArrowLeft,
  Search, CalendarDays, Hash,
} from 'lucide-react';
import type { Apontamento } from '@/types';

/* ── helpers ──────────────────────────────────────────────────── */
function fmtH(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'short',
  });
}
function fmtTime(t: string | null) { return t ? t.slice(0, 5) : '--:--'; }
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/80 ${className}`} />;
}

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

function TipoHoraPill({ tipo }: { tipo: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    normal:    { label: 'Normal', cls: 'bg-gray-100 text-gray-500 border-gray-200'       },
    extra_50:  { label: '+50%',   cls: 'bg-blue-50 text-blue-600 border-blue-200'        },
    extra_100: { label: '+100%',  cls: 'bg-violet-50 text-violet-600 border-violet-200'  },
  };
  const t = map[tipo] ?? { label: tipo, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap', t.cls)}>
      {t.label}
    </span>
  );
}

/* ── tipos ────────────────────────────────────────────────────── */
type GrupoTecnico = {
  tecnicoId: string;
  tecnico: Apontamento['tecnico'];
  apts: Apontamento[];
  pendentes: number;
  aprovados: number;
  rejeitados: number;
  horasAprovadas: number;
};

type ModalTab = 'pendentes' | 'aprovados' | 'rejeitados' | 'todos';

/* ── modal de detalhe do técnico ─────────────────────────────── */
function TecnicoModal({
  grupo,
  onClose,
  onAprovar,
  onRejeitar,
  onViewFotos,
  busy,
}: {
  grupo: GrupoTecnico;
  onClose: () => void;
  onAprovar: (id: string) => void;
  onRejeitar: (ids: string[]) => void;
  onViewFotos: (urls: string[]) => void;
  busy: boolean;
}) {
  const [tab, setTab] = useState<ModalTab>(grupo.pendentes > 0 ? 'pendentes' : 'todos');
  const [viewApt, setViewApt] = useState<Apontamento | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const tabs: { key: ModalTab; label: string; count: number }[] = [
    { key: 'pendentes',  label: 'Pendentes',  count: grupo.pendentes  },
    { key: 'aprovados',  label: 'Aprovados',  count: grupo.aprovados  },
    { key: 'rejeitados', label: 'Rejeitados', count: grupo.rejeitados },
    { key: 'todos',      label: 'Todos',      count: grupo.apts.length },
  ];

  const filteredApts = useMemo(() => {
    const statusMap: Record<ModalTab, string | null> = {
      pendentes: 'pendente', aprovados: 'aprovado', rejeitados: 'rejeitado', todos: null,
    };
    const st = statusMap[tab];
    let list = st ? grupo.apts.filter(a => a.status === st) : grupo.apts;

    // filtro texto — obra ou serviço
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        (a.obra?.nome || 'oficina').toLowerCase().includes(q) ||
        (a.tipo_servico || '').toLowerCase().includes(q)
      );
    }
    // filtro data início
    if (dateFrom) list = list.filter(a => a.data_apontamento >= dateFrom);
    // filtro data fim
    if (dateTo)   list = list.filter(a => a.data_apontamento <= dateTo);

    return [...list].sort((a, b) => {
      if (a.status === 'pendente' && b.status !== 'pendente') return -1;
      if (a.status !== 'pendente' && b.status === 'pendente') return 1;
      return b.data_apontamento.localeCompare(a.data_apontamento);
    });
  }, [grupo.apts, tab, search, dateFrom, dateTo]);

  const hasActiveFilters = search.trim() !== '' || dateFrom !== '' || dateTo !== '';
  function clearFilters() { setSearch(''); setDateFrom(''); setDateTo(''); }

  const pendingInView = filteredApts.filter(a => a.status === 'pendente');
  const selectedSet = new Set(selectedIds);
  const allSelected = pendingInView.length > 0 && pendingInView.every(a => selectedSet.has(a.id));

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleAll() {
    const ids = pendingInView.map(a => a.id);
    setSelectedIds(allSelected ? [] : ids);
  }

  return (
    <>
      {/* Mobile: full screen — Desktop: modal centrado */}
      <DialogContent
        className="fixed inset-0 translate-x-0 translate-y-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:translate-x-[-50%] sm:translate-y-[-50%] w-full sm:max-w-2xl h-full sm:h-[72vh] p-0 gap-0 flex flex-col overflow-hidden border-0 rounded-none sm:shadow-2xl sm:border sm:border-gray-100 sm:rounded-2xl"
      >
        {/* wrapper relativo para o painel de detalhe funcionar */}
        <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* ════ HEADER COMPACTO ════ */}
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
                <span className="text-[11px] text-gray-400">{grupo.apts.length} registo{grupo.apts.length !== 1 ? 's' : ''}</span>
                {grupo.horasAprovadas > 0 && (
                  <>
                    <span className="text-gray-200 select-none">·</span>
                    <span className="text-[11px] font-semibold text-navy">{fmtH(grupo.horasAprovadas)} aprov.</span>
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
            {/* Botão fechar explicit — o do Radix fica tapado pelo overflow-hidden */}
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-navy transition-colors"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab bar — oculta quando está no detalhe */}
          <div className={cn('flex gap-0 px-4 border-t border-gray-100 overflow-x-auto', viewApt ? 'hidden' : '')}>
            {tabs.filter(t => t.count > 0 || t.key === 'todos').map(t => (
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
            {/* Botão filtro no lado direito da tab bar */}
            <div className="ml-auto flex items-center pr-1">
              <button
                onClick={() => setShowFilters(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors',
                  showFilters || hasActiveFilters
                    ? 'bg-navy text-white'
                    : 'text-gray-400 hover:text-navy hover:bg-gray-100'
                )}
                title="Filtros"
              >
                <Search size={12} />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            </div>
          </div>

          {/* Barra de filtros — expandível */}
          {!viewApt && showFilters && (
            <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row gap-2">
              {/* Campo texto */}
              <div className="relative flex-1">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Obra ou serviço…"
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-gray-200 bg-white text-[12px] text-navy placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30"
                />
              </div>
              {/* Data início */}
              <div className="relative">
                <CalendarDays size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="h-9 pl-8 pr-3 rounded-xl border border-gray-200 bg-white text-[12px] text-navy focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30 w-full sm:w-auto"
                  title="Data início"
                />
              </div>
              {/* Data fim */}
              <div className="relative">
                <CalendarDays size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-9 pl-8 pr-3 rounded-xl border border-gray-200 bg-white text-[12px] text-navy focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30 w-full sm:w-auto"
                  title="Data fim"
                />
              </div>
              {/* Limpar filtros */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-9 px-3 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-400 hover:text-navy hover:border-navy/30 transition-colors whitespace-nowrap"
                >
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>{/* fim ════ HEADER ════ */}

        {/* ════ BATCH BAR ════ */}
        {!viewApt && selectedIds.length > 0 && (
          <div className="shrink-0 px-5 py-2.5 bg-slate-50 border-y border-slate-100 flex items-center gap-3">
            <input
              type="checkbox" checked={allSelected} onChange={toggleAll}
              className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer shrink-0"
            />
            <span className="text-[12px] font-semibold text-navy">{selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}</span>
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

        {/* ════ LISTA (estilo card — Aprovações Pendentes) ════ */}
        <div className="flex-1 overflow-y-auto modal-scroll">
          {filteredApts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <CheckCircle2 size={22} className="text-gray-200" />
              </div>
              <p className="text-[14px] font-semibold text-navy">Nenhum registo aqui</p>
              <p className="text-[12px] text-gray-400">Sem apontamentos nesta categoria</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-border/40">
              {filteredApts.map(apt => {
                const isPending = apt.status === 'pendente';
                const isSelected = selectedSet.has(apt.id);
                const fotoUrls = apt.fotos?.map(f => f.url) ?? [];

                return (
                  <div
                    key={apt.id}
                    onClick={() => setViewApt(apt)}
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
                          type="checkbox" checked={isSelected} onChange={() => toggleSelect(apt.id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer"
                        />
                      ) : (
                        <span className="block w-3.5" />
                      )}
                    </div>

                    {/* Date badge */}
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center">
                      <span className="text-[12px] font-black text-navy tabular-nums leading-tight">
                        {fmtDate(apt.data_apontamento).split(' ')[0]}
                      </span>
                      <span className="text-[9px] font-semibold text-gray-400 uppercase leading-tight">
                        {fmtDate(apt.data_apontamento).split(' ')[1]}
                      </span>
                    </div>

                    {/* Obra + Serviço — ocupa o espaço disponível */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-bold text-navy truncate leading-tight">
                          {apt.obra?.nome || 'Oficina'}
                        </p>
                        {apt.obra?.codigo && (
                          <span className="shrink-0 text-[9px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md tabular-nums">
                            {apt.obra.codigo}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5 leading-tight">{apt.tipo_servico}</p>
                    </div>

                    {/* Período — centro */}
                    <div className="shrink-0 text-center">
                      <p className="font-mono text-[10px] text-gray-500 tabular-nums whitespace-nowrap">
                        {fmtTime(apt.hora_entrada)}–{fmtTime(apt.hora_saida)}
                      </p>
                    </div>

                    {/* Horas */}
                    <div className="shrink-0 w-9 text-right">
                      <span className="text-[13px] font-black text-navy tabular-nums">{fmtH(apt.total_horas ?? 0)}</span>
                    </div>

                    {/* Status + botões */}
                    <div className="shrink-0 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <StatusPill status={apt.status} nota={apt.nota_rejeicao} />
                      {fotoUrls.length > 0 && (
                        <button
                          onClick={() => onViewFotos(fotoUrls)}
                          title={`${fotoUrls.length} foto(s)`}
                          className="relative w-7 h-7 rounded-full border border-gray-border text-gray-muted hover:border-accent-blue hover:text-accent-blue hover:bg-accent-blue/8 flex items-center justify-center transition-all"
                        >
                          <Camera size={12} />
                          {fotoUrls.length > 1 && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent-blue text-white text-[7px] font-black flex items-center justify-center leading-none">
                              {fotoUrls.length}
                            </span>
                          )}
                        </button>
                      )}
                      {isPending && (
                        <>
                          <button
                            onClick={() => onAprovar(apt.id)}
                            disabled={busy}
                            title="Aprovar"
                            className="w-7 h-7 rounded-full border border-gray-border text-gray-muted hover:border-success hover:text-success hover:bg-success/8 disabled:opacity-40 flex items-center justify-center transition-all"
                          >
                            <CheckCircle2 size={13} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => onRejeitar([apt.id])}
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
        {viewApt && (
          <div className="absolute inset-0 flex flex-col bg-white z-20 animate-in slide-in-from-right-8 duration-200">

            {/* Cabeçalho do detalhe */}
            <div className="shrink-0 px-5 pt-4 pb-4 border-b border-gray-100">
              {/* Linha topo: botão voltar + fechar */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setViewApt(null)}
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
              {/* Status + horas em destaque */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total de horas</p>
                  <p className="text-[28px] font-black text-navy tabular-nums leading-none">
                    {fmtH(viewApt.total_horas ?? 0)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {new Date(viewApt.data_apontamento + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <StatusPill status={viewApt.status} nota={viewApt.nota_rejeicao} />
              </div>
            </div>

            {/* Corpo do detalhe */}
            <div className="flex-1 overflow-y-auto modal-scroll px-6 py-5 space-y-3">

              {/* Bloco principal */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                {[
                  { label: 'Obra',      value: viewApt.obra?.nome || 'Oficina',  icon: <Building2 size={14} className="text-gray-400" /> },
                  ...(viewApt.obra?.codigo ? [{ label: 'Cód. Obra', value: viewApt.obra.codigo, icon: <Hash size={14} className="text-gray-400" /> }] : []),
                  { label: 'Serviço',   value: viewApt.tipo_servico,                    icon: <Wrench size={14} className="text-gray-400" /> },
                  { label: 'Entrada',   value: fmtTime(viewApt.hora_entrada),            icon: <LogIn size={14} className="text-gray-400" /> },
                  { label: 'Saída',     value: fmtTime(viewApt.hora_saida),              icon: <LogOut size={14} className="text-gray-400" /> },
                  { label: 'Tipo hora', value: viewApt.tipo_hora === 'normal' ? 'Normal' : viewApt.tipo_hora === 'extra_50' ? 'Extra +50%' : 'Extra +100%', icon: <Timer size={14} className="text-gray-400" /> },
                ].map((row, i, arr) => (
                  <div key={i} className={cn('flex items-center gap-4 px-5 py-3.5', i < arr.length - 1 && 'border-b border-gray-50')}>
                    <span className="shrink-0 flex items-center justify-center w-5">{row.icon}</span>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">{row.label}</span>
                      <span className="text-[13px] font-semibold text-navy text-right truncate">{row.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Descrição */}
              {viewApt.descricao && (
                <div className="rounded-2xl border border-gray-100 px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Descrição</p>
                  <p className="text-[13px] text-navy leading-relaxed">{viewApt.descricao}</p>
                </div>
              )}

              {/* Motivo rejeição */}
              {viewApt.status === 'rejeitado' && viewApt.nota_rejeicao && (
                <div className="rounded-2xl border border-red-100 bg-red-50/50 px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1.5">Motivo da Rejeição</p>
                  <p className="text-[13px] text-red-700 leading-relaxed">{viewApt.nota_rejeicao}</p>
                </div>
              )}

              {/* Fotos */}
              {(viewApt.fotos?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">
                    Fotos ({viewApt.fotos!.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {viewApt.fotos!.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noopener noreferrer">
                        <img src={f.url} alt={`Foto ${i + 1}`} className="w-full rounded-xl object-cover aspect-square border border-gray-100 shadow-sm hover:opacity-90 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé com ações (só se pendente) */}
            {viewApt.status === 'pendente' && (
              <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => { onAprovar(viewApt.id); setViewApt(null); }}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-navy text-white text-[13px] font-bold hover:opacity-90 transition-all disabled:opacity-40 shadow-sm"
                >
                  <CheckCircle2 size={15} strokeWidth={2} /> Aprovar
                </button>
                <button
                  onClick={() => { onRejeitar([viewApt.id]); setViewApt(null); }}
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
export default function ApontamentosPage() {
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoTecnico | null>(null);
  const [fotoModal, setFotoModal] = useState<string[] | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; ids: string[]; nota: string }>({
    open: false, ids: [], nota: '',
  });
  const [rejectPending, setRejectPending] = useState(false);

  const { data: apontamentos = [], isLoading } = useApontamentos();
  const updateStatus = useUpdateApontamentoStatus();
  const busy = updateStatus.isPending;

  /* ── agrupamento por técnico — pendentes primeiro ─────────── */
  const grupos = useMemo<GrupoTecnico[]>(() => {
    const map = new Map<string, GrupoTecnico>();
    for (const apt of apontamentos) {
      if (!map.has(apt.tecnico_id)) {
        map.set(apt.tecnico_id, {
          tecnicoId: apt.tecnico_id,
          tecnico: apt.tecnico,
          apts: [],
          pendentes: 0, aprovados: 0, rejeitados: 0,
          horasAprovadas: 0,
        });
      }
      const g = map.get(apt.tecnico_id)!;
      g.apts.push(apt);
      if (apt.status === 'pendente')  g.pendentes++;
      if (apt.status === 'aprovado')  { g.aprovados++; g.horasAprovadas += apt.total_horas ?? 0; }
      if (apt.status === 'rejeitado') g.rejeitados++;
    }
    return Array.from(map.values())
      .sort((a, b) => b.pendentes - a.pendentes || b.horasAprovadas - a.horasAprovadas);
  }, [apontamentos]);

  /* ── stats globais ──────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total: apontamentos.length,
    pendentes: apontamentos.filter(a => a.status === 'pendente').length,
    horasAprovadas: apontamentos.filter(a => a.status === 'aprovado').reduce((s, a) => s + (a.total_horas ?? 0), 0),
    tecnicos: grupos.length,
  }), [apontamentos, grupos]);

  /* ── handlers ───────────────────────────────────────────────── */
  async function handleAprovar(id: string) {
    try {
      await updateStatus.mutateAsync({ id, status: 'aprovado' });
      toast.success('Apontamento aprovado');
    } catch { toast.error('Erro ao aprovar'); }
  }

  function handleRejeitar(ids: string[]) {
    setRejectDialog({ open: true, ids, nota: '' });
  }

  async function handleConfirmRejeitar() {
    const { ids, nota } = rejectDialog;
    setRejectPending(true);
    try {
      await Promise.all(ids.map(id => updateStatus.mutateAsync({ id, status: 'rejeitado', nota_rejeicao: nota.trim() || null })));
      toast.success(`${ids.length} apontamento(s) rejeitado(s)`);
      setRejectDialog({ open: false, ids: [], nota: '' });
    } catch { toast.error('Erro ao rejeitar'); }
    finally { setRejectPending(false); }
  }

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="h-full flex flex-col gap-3 lg:overflow-hidden">

      {/* ── Cabeçalho ──────────────────────────────────────────── */}
      <div className="shrink-0 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Administração</p>
          <h1 className="text-xl font-black text-navy tracking-tight">Apontamentos</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
            <ClipboardList size={11} className="text-blue-500 shrink-0" />
            {isLoading ? '—' : stats.total} registos
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
            <Clock size={11} className="text-slate-500 shrink-0" />
            {isLoading ? '—' : fmtH(stats.horasAprovadas)}
          </div>
          {!isLoading && stats.pendentes > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-700">
              <AlertCircle size={11} className="shrink-0" />
              {stats.pendentes} pendentes
            </div>
          )}
          {!isLoading && stats.pendentes === 0 && stats.total > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600">
              <CheckCircle2 size={11} className="shrink-0" />
              Tudo em dia
            </div>
          )}
        </div>
      </div>

      {/* ── Card da lista de técnicos ──────────────────────────── */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden flex flex-col">

        {/* Cabeçalho da lista */}
        <div className="shrink-0 flex items-center px-5 h-10 border-b border-gray-border/60 bg-gray-bg/60">
          <span className="flex-1 text-[9px] font-black uppercase tracking-widest text-gray-muted">Funcionário</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-muted hidden sm:block w-[120px] text-center">Horas aprovadas</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-muted w-[100px] text-right">Estado</span>
          <span className="w-6 shrink-0" />
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Loading */}
          {isLoading && (
            <div className="divide-y divide-gray-border/40">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Sk className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Sk className="h-3.5 w-40" />
                    <Sk className="h-2.5 w-24" />
                  </div>
                  <Sk className="w-[80px] h-6 rounded-full hidden sm:block" />
                  <Sk className="w-[80px] h-6 rounded-full" />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && grupos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Clock size={22} className="text-gray-muted/40" />
              </div>
              <p className="text-[13px] font-semibold text-navy">Sem apontamentos registados</p>
              <p className="text-[11px] text-gray-muted">Os apontamentos aparecerão aqui quando forem submetidos</p>
            </div>
          )}

          {/* Lista de técnicos */}
          {!isLoading && grupos.map(grupo => (
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
                  {grupo.apts.length} registo{grupo.apts.length !== 1 ? 's' : ''}
                  {grupo.rejeitados > 0 && (
                    <span className="text-red-400 ml-1.5">· {grupo.rejeitados} rejeitado{grupo.rejeitados !== 1 ? 's' : ''}</span>
                  )}
                </p>
              </div>

              {/* Horas aprovadas */}
              <div className="hidden sm:flex items-center gap-1.5 w-[120px] justify-center shrink-0">
                {grupo.horasAprovadas > 0 ? (
                  <span className="text-[12px] font-black text-navy tabular-nums">{fmtH(grupo.horasAprovadas)}</span>
                ) : (
                  <span className="text-[11px] text-gray-muted">—</span>
                )}
              </div>

              {/* Badge de estado */}
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

      {/* ── Modal de detalhe do técnico ────────────────────────── */}
      <Dialog open={!!selectedGrupo} onOpenChange={o => !o && setSelectedGrupo(null)}>
        {selectedGrupo && (
          <TecnicoModal
            grupo={grupos.find(g => g.tecnicoId === selectedGrupo.tecnicoId) ?? selectedGrupo}
            onClose={() => setSelectedGrupo(null)}
            onAprovar={handleAprovar}
            onRejeitar={handleRejeitar}
            onViewFotos={setFotoModal}
            busy={busy}
          />
        )}
      </Dialog>

      {/* ── Modal de fotos ─────────────────────────────────────── */}
      <Dialog open={!!fotoModal} onOpenChange={() => setFotoModal(null)}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-navy font-black">Fotos do Apontamento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {fotoModal?.map((url, i) => (
              <img key={i} src={url} alt={`Foto ${i + 1}`} className="w-full rounded-xl object-cover aspect-square shadow-sm" />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog de rejeição ─────────────────────────────────── */}
      <Dialog open={rejectDialog.open} onOpenChange={o => !o && setRejectDialog({ open: false, ids: [], nota: '' })}>
        <DialogContent className="max-w-md rounded-2xl p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-gray-border/60">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Confirmação</p>
              <DialogTitle className="text-navy font-black text-[16px] tracking-tight mt-0.5">
                Rejeitar {rejectDialog.ids.length > 1 ? `${rejectDialog.ids.length} Apontamentos` : 'Apontamento'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-5 py-4 space-y-3">
            <p className="text-[12px] text-gray-muted">
              Motivo da rejeição (opcional). O técnico poderá ver esta nota.
            </p>
            <textarea
              value={rejectDialog.nota}
              onChange={e => setRejectDialog(p => ({ ...p, nota: e.target.value }))}
              placeholder="Ex: Horário incorrecto, faltam detalhes..."
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

    </div>
  );
}
