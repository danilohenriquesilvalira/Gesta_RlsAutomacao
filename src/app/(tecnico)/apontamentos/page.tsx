'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2, Clock, AlertCircle, XCircle,
  Plus, Search, X, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { EntryCard } from '@/components/tecnico/EntryCard';
import { ApontarModal } from '@/components/shared/ApontarModal';
import { EditarApontamentoModal } from '@/components/tecnico/EditarApontamentoModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  useApontamentos,
  useCreateApontamento,
  useUpdateApontamento,
  useDeleteApontamento,
} from '@/lib/queries/apontamentos';
import { useObras } from '@/lib/queries/obras';
import { saveOfflineApontamento } from '@/lib/offline/indexeddb';
import type { Apontamento, ApontamentoStatus, TipoHora } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

const MES     = new Date().toLocaleDateString('pt-PT', { month: 'long' });
const MES_KEY = new Date().toISOString().slice(0, 7);
const ITEMS_PER_PAGE = 8;

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-border/60 ${className}`} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApontamentosPage() {
  const { profile }  = useAuth();
  const { isOnline, refreshCount } = useOfflineSync();

  const [modalOpen,     setModalOpen]     = useState(false);
  const [editingApt,    setEditingApt]    = useState<Apontamento | null>(null);
  const [deletingAptId, setDeletingAptId] = useState<string | null>(null);

  // Filtros + página (reset da página sempre que um filtro muda)
  const [page,         setPage]          = useState(0);
  const [search,       _setSearch]       = useState('');
  const [filterStatus, _setFilterStatus] = useState<ApontamentoStatus | ''>('');
  const [filterObra,   _setFilterObra]   = useState('');

  const setSearch       = (v: string)                  => { _setSearch(v);       setPage(0); };
  const setFilterStatus = (v: ApontamentoStatus | '') => { _setFilterStatus(v); setPage(0); };
  const setFilterObra   = (v: string)                  => { _setFilterObra(v);   setPage(0); };
  const clear = () => { _setSearch(''); _setFilterStatus(''); _setFilterObra(''); setPage(0); };
  const hasFilter = !!(search || filterStatus || filterObra);

  // ── Dados ──────────────────────────────────────────────────────────────────

  const { data: apontamentos = [], isLoading } = useApontamentos(
    profile ? { tecnicoId: profile.id } : undefined
  );
  const { data: obras = [] } = useObras('ativa');

  const createApt = useCreateApontamento();
  const updateApt = useUpdateApontamento();
  const deleteApt = useDeleteApontamento();

  // ── Stats ──────────────────────────────────────────────────────────────────

  const horasMesAprov = useMemo(() =>
    apontamentos
      .filter(a => a.status === 'aprovado' && a.data_apontamento.startsWith(MES_KEY))
      .reduce((s, a) => s + (a.total_horas ?? 0), 0),
    [apontamentos]
  );
  const pendentes    = useMemo(() => apontamentos.filter(a => a.status === 'pendente').length,  [apontamentos]);
  const aptAprovados = useMemo(() => apontamentos.filter(a => a.status === 'aprovado').length,  [apontamentos]);
  const aptRejeitados= useMemo(() => apontamentos.filter(a => a.status === 'rejeitado').length, [apontamentos]);

  // ── Obras únicas do histórico ───────────────────────────────────────────────

  const obrasHist = useMemo(() => {
    const m = new Map<string, { id: string; codigo: string; nome: string }>();
    apontamentos.forEach(a => {
      if (a.obra_id && a.obra) m.set(a.obra_id, { id: a.obra_id, codigo: a.obra.codigo, nome: a.obra.nome });
    });
    return Array.from(m.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [apontamentos]);

  // ── Filtragem + ordenação + paginação ──────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return apontamentos
      .filter(a => {
        if (q && !a.obra?.nome?.toLowerCase().includes(q) && !a.obra?.codigo?.toLowerCase().includes(q) && !a.tipo_servico?.toLowerCase().includes(q)) return false;
        if (filterStatus && a.status !== filterStatus) return false;
        if (filterObra   && a.obra_id !== filterObra)  return false;
        return true;
      })
      .sort((a, b) => b.data_apontamento.localeCompare(a.data_apontamento));
  }, [apontamentos, search, filterStatus, filterObra]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated  = useMemo(() =>
    filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE),
    [filtered, page]
  );

  // Info de contagem para o rodapé de paginação
  const rangeStart = filtered.length === 0 ? 0 : page * ITEMS_PER_PAGE + 1;
  const rangeEnd   = Math.min((page + 1) * ITEMS_PER_PAGE, filtered.length);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleApontar(data: {
    obra_id: string | null; data_apontamento: string; tipo_servico: string;
    tipo_hora: TipoHora; hora_entrada: string; hora_saida: string;
    total_horas: number; descricao?: string; fotos_base64: string[];
  }) {
    if (!profile) return;
    try {
      if (isOnline) { await createApt.mutateAsync({ tecnico_id: profile.id, ...data }); }
      else { await saveOfflineApontamento({ local_id: crypto.randomUUID(), tecnico_id: profile.id, ...data, created_at: new Date().toISOString() }); await refreshCount(); }
      setModalOpen(false);
    } catch { toast.error('Erro ao guardar o registo.'); }
  }

  async function handleEdit(data: {
    obra_id: string; tipo_servico: string; tipo_hora: TipoHora;
    hora_entrada: string; hora_saida: string; total_horas: number; descricao?: string;
  }) {
    if (!editingApt) return;
    try { await updateApt.mutateAsync({ id: editingApt.id, ...data }); toast.success('Registo actualizado.'); setEditingApt(null); }
    catch { toast.error('Erro ao actualizar o registo.'); }
  }

  async function handleDelete() {
    if (!deletingAptId) return;
    try { await deleteApt.mutateAsync(deletingAptId); toast.success('Registo eliminado.'); setDeletingAptId(null); }
    catch { toast.error('Erro ao eliminar o registo.'); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 pb-4 lg:h-full lg:gap-3 lg:pb-0">

      {/* ── Cabeçalho ── */}
      <div className="lg:shrink-0 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Registo de Horas</p>
          <h1 className="text-2xl font-black text-navy tracking-tight mt-0.5">Apontamentos</h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 h-10 px-4 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy-light transition-colors shadow-sm shadow-navy/20 shrink-0"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Registar Horas</span>
          <span className="sm:hidden">Registar</span>
        </button>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="lg:shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-[78px]" />)
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-border shadow-sm p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Horas Apr.</p>
                <div className="w-6 h-6 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-success" />
                </div>
              </div>
              <p className="text-[20px] font-black text-navy leading-none">{fmt(horasMesAprov)}</p>
              <p className="text-[10px] text-gray-muted mt-1 capitalize">em {MES}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-border shadow-sm p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Total</p>
                <div className="w-6 h-6 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                  <Clock size={12} className="text-accent-blue" />
                </div>
              </div>
              <p className="text-[20px] font-black text-navy leading-none">{apontamentos.length}</p>
              <p className="text-[10px] text-gray-muted mt-1">registo{apontamentos.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-border shadow-sm p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Pendentes</p>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${pendentes > 0 ? 'bg-warning/10' : 'bg-gray-bg'}`}>
                  <AlertCircle size={12} className={pendentes > 0 ? 'text-warning' : 'text-gray-muted'} />
                </div>
              </div>
              <p className={`text-[20px] font-black leading-none ${pendentes > 0 ? 'text-warning' : 'text-navy'}`}>{pendentes}</p>
              <p className="text-[10px] text-gray-muted mt-1">em aprovação</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-border shadow-sm p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Aprovados</p>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${aptRejeitados > 0 ? 'bg-error/10' : 'bg-success/10'}`}>
                  {aptRejeitados > 0
                    ? <XCircle size={12} className="text-error" />
                    : <CheckCircle2 size={12} className="text-success" />
                  }
                </div>
              </div>
              <p className="text-[20px] font-black text-navy leading-none">{aptAprovados}</p>
              <p className="text-[10px] mt-1">
                {aptRejeitados > 0
                  ? <span className="text-error font-semibold">{aptRejeitados} rejeitado{aptRejeitados !== 1 ? 's' : ''}</span>
                  : <span className="text-gray-muted">confirmados</span>
                }
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Filtros ── */}
      <div className="lg:shrink-0 flex gap-2 flex-wrap items-center">

        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar obra ou tipo de serviço..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-9 rounded-xl border border-gray-border bg-white text-sm text-gray-text placeholder:text-gray-muted/50 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-muted hover:text-gray-text transition-colors">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Segmented control — dimensões fixas, zero layout shift */}
        <div className="inline-flex items-center bg-gray-100 rounded-xl p-[3px] shrink-0 gap-[2px]">
          {([
            { v: '',          l: 'Todos',     active: 'text-navy'    },
            { v: 'pendente',  l: 'Pendente',  active: 'text-warning' },
            { v: 'aprovado',  l: 'Aprovado',  active: 'text-success' },
            { v: 'rejeitado', l: 'Rejeitado', active: 'text-error'   },
          ] as { v: ApontamentoStatus | ''; l: string; active: string }[]).map(({ v, l, active }) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={`h-[30px] px-3 rounded-[9px] text-[11px] font-semibold transition-all whitespace-nowrap ${
                filterStatus === v
                  ? `bg-white shadow-sm ${active}`
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {obrasHist.length > 0 && (
          <div className="relative shrink-0">
            <select
              value={filterObra}
              onChange={e => setFilterObra(e.target.value)}
              className="h-10 pl-4 pr-9 rounded-xl border border-gray-border bg-white text-xs font-medium text-gray-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30 transition-all max-w-[190px]"
            >
              <option value="">Todas as obras</option>
              {obrasHist.map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-muted pointer-events-none" />
          </div>
        )}

        {/* Sempre renderizado com invisible — zero layout shift */}
        <button
          onClick={clear}
          className={`h-10 w-10 rounded-xl border border-gray-border bg-white flex items-center justify-center text-gray-muted hover:text-error hover:border-error/30 transition-all shrink-0 ${hasFilter ? 'visible' : 'invisible'}`}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Lista (flex-1 + scroll interno se necessário) ── */}
      <div className="lg:flex-1 lg:overflow-y-auto lg:min-h-0">

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <Sk key={i} className="h-[120px]" />)}
          </div>

        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center h-full">
            <div className="w-14 h-14 rounded-2xl border border-gray-border bg-gray-bg flex items-center justify-center">
              <Clock size={22} className="text-gray-muted" strokeWidth={1.4} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-navy">
                {apontamentos.length === 0 ? 'Sem registos de horas' : 'Nenhum resultado'}
              </p>
              <p className="text-xs text-gray-muted">
                {apontamentos.length === 0
                  ? 'Clique em "Registar Horas" para começar.'
                  : 'Tente ajustar os filtros.'}
              </p>
            </div>
            {hasFilter && (
              <button onClick={clear} className="text-xs text-accent-blue hover:underline font-medium">
                Limpar filtros
              </button>
            )}
          </div>

        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paginated.map(apt => (
              <div key={apt.id} className="min-w-0">
                <EntryCard
                  apontamento={{
                    id:           apt.id,
                    obra_codigo:  apt.obra?.codigo  ?? '',
                    obra_nome:    apt.obra?.nome    ?? '',
                    tipo_servico: apt.tipo_servico,
                    hora_entrada: apt.hora_entrada,
                    hora_saida:   apt.hora_saida    ?? '',
                    total_horas:  apt.total_horas   ?? 0,
                    tipo_hora:    apt.tipo_hora,
                    status:       apt.status,
                    fotos_count:  apt.fotos?.length ?? 0,
                  }}
                  onEdit={apt.status === 'pendente' ? () => setEditingApt(apt) : undefined}
                  onDelete={apt.status === 'pendente' ? () => setDeletingAptId(apt.id) : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Paginação (shrink-0, fora do scroll, sempre ocupa espaço) ── */}
      <div className={`lg:shrink-0 flex items-center justify-between pt-3 border-t border-gray-border ${isLoading || filtered.length === 0 || totalPages <= 1 ? 'invisible' : ''}`}>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-border bg-white text-xs font-semibold text-gray-muted hover:text-navy hover:border-navy/30 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft size={13} /> Anterior
        </button>

        <p className="text-[11px] text-gray-muted">
          <span className="font-black text-navy">{rangeStart}</span>
          {' '}–{' '}
          <span className="font-black text-navy">{rangeEnd}</span>
          {' '}de{' '}
          <span className="font-black text-navy">{filtered.length}</span>
          {' '}registo{filtered.length !== 1 ? 's' : ''}
        </p>

        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-border bg-white text-xs font-semibold text-gray-muted hover:text-navy hover:border-navy/30 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          Seguinte <ChevronRight size={13} />
        </button>
      </div>

      {/* ── Modais ── */}
      <ApontarModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        obras={obras}
        onSubmit={handleApontar}
        isSubmitting={createApt.isPending}
      />
      <EditarApontamentoModal
        open={editingApt !== null}
        onClose={() => setEditingApt(null)}
        apontamento={editingApt}
        obras={obras}
        onSubmit={handleEdit}
        isSubmitting={updateApt.isPending}
      />
      <ConfirmDialog
        open={deletingAptId !== null}
        onOpenChange={o => { if (!o) setDeletingAptId(null); }}
        title="Eliminar Registo"
        description="Tem a certeza que deseja eliminar este registo? Esta acção não pode ser desfeita."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        isLoading={deleteApt.isPending}
        variant="danger"
      />
    </div>
  );
}
