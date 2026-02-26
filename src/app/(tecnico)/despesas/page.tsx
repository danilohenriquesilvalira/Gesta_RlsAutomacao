'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useDespesas, useCreateDespesa, useUpdateDespesa, useDeleteDespesa } from '@/lib/queries/despesas';
import { useObras } from '@/lib/queries/obras';
import { DespesaModal } from '@/components/tecnico/DespesaModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Despesa, DespesaStatus, TipoDespesa } from '@/types';
import type { ReciboFile } from '@/components/tecnico/ReciboUpload';
import { Plus, ChevronLeft, ChevronRight, Receipt, CheckCircle2, AlertCircle, XCircle, Eye } from 'lucide-react';

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
}

function eur(v: number) {
  return v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

const TIPO_COLORS: Record<string, string> = {
  alojamento: '#8b5cf6',
  alimentação: '#f97316',
  transporte: '#0ea5e9',
  combustível: '#eab308',
  material: '#14b8a6',
  outro: '#94a3b8',
};

const TIPO_STATUS_BAR: Record<string, string> = {
  pendente:  'bg-warning',
  aprovada:  'bg-success',
  rejeitada: 'bg-error',
};
const TIPO_STATUS_BADGE: Record<string, string> = {
  pendente:  'bg-warning/10 text-warning border border-warning/20',
  aprovada:  'bg-success/10 text-success border border-success/20',
  rejeitada: 'bg-error/10 text-error border border-error/20',
};
const TIPO_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada',
};

export default function MinhasDespesasPage() {
  const { profile } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editDespesa, setEditDespesa] = useState<Despesa | null>(null);
  const [viewDespesa, setViewDespesa] = useState<Despesa | null>(null);
  const [deleteDespesa, setDeleteDespesa] = useState<Despesa | null>(null);

  const ITEMS_PER_PAGE = 6;
  const [page,        setPage]        = useState(0);
  const [filterStatus, _setFilterSt]  = useState('');
  const setFilterStatus = (v: string) => { _setFilterSt(v); setPage(0); };
  const [search, _setSearch] = useState('');
  const setSearch = (v: string) => { _setSearch(v); setPage(0); };

  const { data: despesas = [], isLoading } = useDespesas(
    profile ? { tecnicoId: profile.id } : undefined
  );
  const { data: obras = [] } = useObras();
  const createDespesa = useCreateDespesa();
  const updateDespesa = useUpdateDespesa();
  const deleteDespesaMutation = useDeleteDespesa();

  const totalGasto    = useMemo(() => despesas.reduce((s, d) => s + Number(d.valor), 0), [despesas]);
  const totalAprovado = useMemo(() => despesas.filter(d => d.status === 'aprovada').reduce((s, d) => s + Number(d.valor), 0), [despesas]);
  const totalPendente = useMemo(() => despesas.filter(d => d.status === 'pendente').reduce((s, d) => s + Number(d.valor), 0), [despesas]);
  const totalRejeitado= useMemo(() => despesas.filter(d => d.status === 'rejeitada').reduce((s, d) => s + Number(d.valor), 0), [despesas]);

  const tipoStats = useMemo(() => {
    const map: Record<string, number> = {};
    despesas.forEach(d => { map[d.tipo_despesa] = (map[d.tipo_despesa] ?? 0) + Number(d.valor); });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, valor]) => ({ tipo, valor, pct: total > 0 ? Math.round((valor / total) * 100) : 0 }));
  }, [despesas]);

  const filtered = useMemo(() => {
    const byStatus = filterStatus ? despesas.filter(d => d.status === filterStatus) : despesas;
    if (!search.trim()) return byStatus;
    const q = search.toLowerCase();
    return byStatus.filter(d =>
      d.tipo_despesa.toLowerCase().includes(q) ||
      (d.obra?.nome ?? '').toLowerCase().includes(q) ||
      (d.descricao ?? '').toLowerCase().includes(q)
    );
  }, [despesas, filterStatus, search]);
  const sortedFiltered = useMemo(() =>
    [...filtered].sort((a, b) => b.data_despesa.localeCompare(a.data_despesa)),
    [filtered]
  );
  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / ITEMS_PER_PAGE));
  const paginated  = useMemo(() =>
    sortedFiltered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE),
    [sortedFiltered, page]
  );
  const rangeStart = sortedFiltered.length === 0 ? 0 : page * ITEMS_PER_PAGE + 1;
  const rangeEnd   = Math.min((page + 1) * ITEMS_PER_PAGE, sortedFiltered.length);

  async function handleCreate(data: {
    obra_id?: string | null;
    tipo_despesa: TipoDespesa;
    valor: number;
    data_despesa: string;
    descricao?: string;
    ficheiros: ReciboFile[];
  }) {
    if (!profile) return;
    try {
      await createDespesa.mutateAsync({
        tecnico_id: profile.id,
        obra_id: data.obra_id ?? null,
        tipo_despesa: data.tipo_despesa,
        valor: data.valor,
        data_despesa: data.data_despesa,
        descricao: data.descricao,
        ficheiros: data.ficheiros,
      });
      toast.success('Despesa registada com sucesso!');
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registar despesa');
    }
  }

  async function handleUpdate(data: {
    obra_id?: string | null;
    tipo_despesa: TipoDespesa;
    valor: number;
    data_despesa: string;
    descricao?: string;
    ficheiros: ReciboFile[];
  }) {
    if (!profile || !editDespesa) return;
    try {
      await updateDespesa.mutateAsync({
        id: editDespesa.id,
        tecnico_id: profile.id,
        obra_id: data.obra_id ?? null,
        tipo_despesa: data.tipo_despesa,
        valor: data.valor,
        data_despesa: data.data_despesa,
        descricao: data.descricao ?? null,
        novos_ficheiros: data.ficheiros,
      });
      toast.success('Despesa actualizada!');
      setEditDespesa(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao actualizar despesa');
    }
  }

  async function handleDelete() {
    if (!deleteDespesa) return;
    try {
      await deleteDespesaMutation.mutateAsync(deleteDespesa.id);
      toast.success('Despesa eliminada');
      setDeleteDespesa(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao eliminar despesa');
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-4 lg:h-full lg:gap-3 lg:pb-0">

      {/* ── Cabeçalho ── */}
      <div className="lg:shrink-0 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Fundo de Maneio</p>
          <h1 className="text-2xl font-black text-navy tracking-tight mt-0.5">Despesas</h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 h-10 px-4 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy-light transition-colors shadow-sm shadow-navy/20 shrink-0"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nova Despesa</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      {/* ── Stats em € ── */}
      <div className="lg:shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-gray-border/60 h-[78px]" />
          ))
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-border shadow-sm p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Total</p>
                <div className="w-6 h-6 rounded-lg bg-navy/10 flex items-center justify-center">
                  <Receipt size={12} className="text-navy" />
                </div>
              </div>
              <p className="text-[16px] font-black text-navy leading-none">{eur(totalGasto)}</p>
              <p className="text-[10px] text-gray-muted mt-1">{despesas.length} registo{despesas.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-border shadow-sm p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Aprovado</p>
                <div className="w-6 h-6 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-success" />
                </div>
              </div>
              <p className="text-[16px] font-black text-success leading-none">{eur(totalAprovado)}</p>
              <p className="text-[10px] text-gray-muted mt-1">confirmado</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-border shadow-sm p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Pendente</p>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${totalPendente > 0 ? 'bg-warning/10' : 'bg-gray-bg'}`}>
                  <AlertCircle size={12} className={totalPendente > 0 ? 'text-warning' : 'text-gray-muted'} />
                </div>
              </div>
              <p className={`text-[16px] font-black leading-none ${totalPendente > 0 ? 'text-warning' : 'text-navy'}`}>{eur(totalPendente)}</p>
              <p className="text-[10px] text-gray-muted mt-1">em aprovação</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-border shadow-sm p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Rejeitado</p>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${totalRejeitado > 0 ? 'bg-error/10' : 'bg-gray-bg'}`}>
                  <XCircle size={12} className={totalRejeitado > 0 ? 'text-error' : 'text-gray-muted'} />
                </div>
              </div>
              <p className={`text-[16px] font-black leading-none ${totalRejeitado > 0 ? 'text-error' : 'text-navy'}`}>{eur(totalRejeitado)}</p>
              <p className="text-[10px] text-gray-muted mt-1">não aprovado</p>
            </div>
          </>
        )}
      </div>

      {/* ── Pesquisa ── */}
      <div className="lg:shrink-0 relative">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-muted pointer-events-none">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Pesquisar por tipo, obra ou descrição..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-9 rounded-xl border border-gray-border bg-white text-sm text-gray-text placeholder:text-gray-muted/50 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30 transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-muted hover:text-gray-text transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Distribuição por tipo (desktop only, compact) ── */}
      {!isLoading && tipoStats.length > 0 && (
        <div className="hidden lg:block lg:shrink-0">
          <div className="bg-white rounded-xl border border-gray-border shadow-sm px-4 py-3">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Análise</p>
                <h3 className="text-[13px] font-bold text-navy leading-tight">Distribuição por Tipo</h3>
              </div>
              <p className="text-[12px] font-black text-navy">{eur(totalGasto)}</p>
            </div>
            <div className="space-y-2">
              {tipoStats.slice(0, 5).map(({ tipo, valor, pct }) => (
                <div key={tipo} className="flex items-center gap-3">
                  <p className="text-[10px] font-semibold text-gray-text w-24 capitalize shrink-0">{tipo}</p>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: TIPO_COLORS[tipo] ?? '#94a3b8' }}
                    />
                  </div>
                  <span className="text-[9px] font-black text-gray-muted w-7 text-right shrink-0">{pct}%</span>
                  <span className="text-[10px] font-bold text-navy w-20 text-right shrink-0">{eur(valor)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Filtro ── */}
      <div className="lg:shrink-0">
        <div className="inline-flex items-center bg-gray-100 rounded-xl p-[3px] gap-[2px]">
          {([
            { v: '',          l: 'Todas'     },
            { v: 'pendente',  l: 'Pendente'  },
            { v: 'aprovada',  l: 'Aprovada'  },
            { v: 'rejeitada', l: 'Rejeitada' },
          ]).map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={`h-[30px] px-3 rounded-[9px] text-[11px] font-semibold transition-all whitespace-nowrap ${
                filterStatus === v
                  ? 'bg-white shadow-sm text-navy'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista ── */}
      <div className="lg:flex-1 lg:overflow-y-auto lg:min-h-0">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-gray-border/60 h-[130px]" />
            ))}
          </div>
        ) : sortedFiltered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center h-full">
            <div className="w-14 h-14 rounded-2xl border border-gray-border bg-gray-bg flex items-center justify-center">
              <Receipt size={22} className="text-gray-muted" strokeWidth={1.4} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-navy">
                {despesas.length === 0 ? 'Sem despesas registadas' : 'Nenhum resultado'}
              </p>
              <p className="text-xs text-gray-muted">
                {despesas.length === 0
                  ? 'Clique em "Nova Despesa" para começar.'
                  : search
                  ? 'Tente outro termo de pesquisa.'
                  : 'Tente outro filtro.'}
              </p>
            </div>
            <div className="flex gap-2">
              {search && (
                <button onClick={() => setSearch('')} className="text-xs text-accent-blue hover:underline font-medium">
                  Limpar pesquisa
                </button>
              )}
              {filterStatus && (
                <button onClick={() => setFilterStatus('')} className="text-xs text-accent-blue hover:underline font-medium">
                  Ver todas
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {paginated.map((despesa) => (
              <div
                key={despesa.id}
                className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${TIPO_STATUS_BAR[despesa.status] ?? 'bg-gray-border'}`} />
                <div className="pl-5 pr-4 pt-4 pb-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black text-accent-blue tracking-widest uppercase capitalize">
                        {despesa.tipo_despesa}
                      </span>
                      <p className="text-sm font-semibold text-navy truncate mt-0.5">
                        {despesa.obra?.nome || 'Oficina'}
                      </p>
                      {despesa.descricao && (
                        <p className="text-xs text-gray-muted mt-0.5 truncate">{despesa.descricao}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-black text-navy">{eur(Number(despesa.valor))}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${TIPO_STATUS_BADGE[despesa.status] ?? ''}`}>
                        {TIPO_STATUS_LABEL[despesa.status]}
                      </span>
                    </div>
                  </div>
                  {/* Divider */}
                  <div className="border-t border-gray-border/70 mb-3" />
                  {/* Data */}
                  <p className="text-xs text-gray-muted capitalize">
                    {new Date(despesa.data_despesa + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {/* Acções */}
                  <div className="border-t border-gray-border/70 mt-3 pt-2.5 flex gap-2">
                    <button
                      onClick={() => setViewDespesa(despesa)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-border py-1.5 text-xs font-semibold text-gray-text hover:border-navy hover:text-navy transition-colors"
                    >
                      <Eye size={11} />
                      {despesa.recibos?.length ?? 0} recibo{(despesa.recibos?.length ?? 0) !== 1 ? 's' : ''}
                    </button>
                    {despesa.status === 'pendente' && (
                      <>
                        <button
                          onClick={() => setEditDespesa(despesa)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-border py-1.5 text-xs font-semibold text-gray-text hover:border-navy hover:text-navy transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteDespesa(despesa)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-error/25 py-1.5 text-xs font-semibold text-error hover:bg-error/5 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                          Apagar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Paginação ── */}
      <div className={`lg:shrink-0 flex items-center justify-between pt-3 border-t border-gray-border ${isLoading || sortedFiltered.length === 0 || totalPages <= 1 ? 'invisible' : ''}`}>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-border bg-white text-xs font-semibold text-gray-muted hover:text-navy hover:border-navy/30 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft size={13} /> Anterior
        </button>
        <p className="text-[11px] text-gray-muted">
          <span className="font-black text-navy">{rangeStart}</span>{' '}–{' '}<span className="font-black text-navy">{rangeEnd}</span>{' '}de{' '}<span className="font-black text-navy">{sortedFiltered.length}</span>{' '}registo{sortedFiltered.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-border bg-white text-xs font-semibold text-gray-muted hover:text-navy hover:border-navy/30 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          Seguinte <ChevronRight size={13} />
        </button>
      </div>

      {/* Modal criar */}
      <DespesaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        obras={obras}
        onSubmit={handleCreate}
        isSubmitting={createDespesa.isPending}
        tecnicoId={profile?.id}
      />

      {/* Modal editar */}
      <DespesaModal
        open={!!editDespesa}
        onClose={() => setEditDespesa(null)}
        obras={obras}
        onSubmit={handleUpdate}
        isSubmitting={updateDespesa.isPending}
        tecnicoId={profile?.id}
        initialDespesa={editDespesa ?? undefined}
      />

      {/* Dialog ver recibos */}
      <Dialog open={!!viewDespesa} onOpenChange={(o) => !o && setViewDespesa(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-navy font-bold">Recibos</DialogTitle>
          </DialogHeader>
          {viewDespesa && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
                <p><span className="font-medium">Tipo:</span> {viewDespesa.tipo_despesa}</p>
                <p><span className="font-medium">Obra:</span> {viewDespesa.obra?.nome ?? 'Oficina'}</p>
                <p><span className="font-medium">Valor:</span> {Number(viewDespesa.valor).toFixed(2)} €</p>
                <p><span className="font-medium">Data:</span> {formatDate(viewDespesa.data_despesa)}</p>
                <p className="flex items-center gap-1">
                  <span className="font-medium">Estado:</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${TIPO_STATUS_BADGE[viewDespesa.status] ?? ''}`}>
                    {TIPO_STATUS_LABEL[viewDespesa.status]}
                  </span>
                </p>
              </div>
              {(viewDespesa.recibos?.length ?? 0) === 0 ? (
                <p className="text-center text-gray-muted py-6">Sem recibos anexados</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {viewDespesa.recibos!.map((recibo) =>
                    recibo.tipo_ficheiro === 'imagem' ? (
                      <a key={recibo.id} href={recibo.url} target="_blank" rel="noopener noreferrer">
                        <img src={recibo.url} alt="Recibo" className="w-full rounded-lg object-cover aspect-square border border-gray-border hover:opacity-90 transition-opacity" />
                      </a>
                    ) : (
                      <a key={recibo.id} href={recibo.url} target="_blank" rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center gap-2 aspect-square rounded-lg border border-gray-border bg-red-50 hover:bg-red-100 transition-colors p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        </svg>
                        <span className="text-xs text-red-600 font-medium">Abrir PDF</span>
                      </a>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog confirmação de apagar */}
      <ConfirmDialog
        open={!!deleteDespesa}
        onOpenChange={(o) => !o && setDeleteDespesa(null)}
        title="Apagar Despesa"
        description={`Tens a certeza que queres apagar esta despesa de ${deleteDespesa ? Number(deleteDespesa.valor).toFixed(2) + ' €' : ''}? Esta acção não pode ser desfeita.`}
        confirmLabel="Apagar"
        onConfirm={handleDelete}
        isLoading={deleteDespesaMutation.isPending}
        variant="danger"
      />
    </div>
  );
}
