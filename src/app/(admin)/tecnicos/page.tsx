'use client';

import { useState, useMemo } from 'react';
import { useTecnicosComHoras, useToggleTecnicoAtivo, useDeleteFuncionario } from '@/lib/queries/tecnicos';
import { useApontamentos, useUpdateApontamentoStatus } from '@/lib/queries/apontamentos';
import { useRecibosPagamento, useCreateReciboPagamento, useDeleteReciboPagamento } from '@/lib/queries/recibos-pagamento';
import { useAuth } from '@/hooks/useAuth';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { EditTecnicoModal } from '@/components/admin/EditTecnicoModal';
import { ApontamentosTable } from '@/components/admin/ApontamentosTable';
import { ReciboPagamentoModal } from '@/components/admin/ReciboPagamentoModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Users, Clock, UserPlus, Pencil, ClipboardList, Building2, Power, Trash2,
  Receipt, FileText, ExternalLink, PlusCircle, Search, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { TecnicoRow } from '@/components/admin/TecnicosTable';

const MAX_HORAS_MES = 176; // ~22 dias × 8h

function fmtH(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/80 ${className}`} />;
}

export default function TecnicosPage() {
  const { profile } = useAuth();
  const { data: tecnicos = [], isLoading } = useTecnicosComHoras();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTec, setEditingTec] = useState<TecnicoRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtros e paginação
  const [search, setSearch] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 9;

  // Recibos de pagamento
  const [recibosId, setRecibosId]           = useState<string | null>(null);
  const [uploadReciboOpen, setUploadReciboOpen] = useState(false);
  const [deletingReciboId, setDeletingReciboId] = useState<{ id: string; storagePath: string } | null>(null);

  const { data: tecApts = [], isLoading: lApts } = useApontamentos(
    selectedId ? { tecnicoId: selectedId } : undefined
  );
  const { data: tecnicoRecibos = [], isLoading: lRecibos } = useRecibosPagamento(
    recibosId ?? ''
  );
  const createRecibo = useCreateReciboPagamento();
  const deleteRecibo = useDeleteReciboPagamento();
  const updateStatus = useUpdateApontamentoStatus();
  const toggleAtivo = useToggleTecnicoAtivo();
  const deleteFuncionario = useDeleteFuncionario();

  const deletingFuncionario = tecnicos.find((t) => t.id === deletingId);

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await deleteFuncionario.mutateAsync(deletingId);
      toast.success('Funcionário eliminado com sucesso');
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('foreign key') || msg.includes('violates')) {
        toast.error('Não é possível eliminar: o funcionário tem registos associados');
      } else {
        toast.error(err.message || 'Erro ao eliminar funcionário');
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreateRecibo(data: {
    tecnico_id: string;
    periodo: string;
    valor_bruto: number;
    valor_liquido?: number | null;
    descricao?: string;
    file: File;
  }) {
    if (!profile) return;
    try {
      await createRecibo.mutateAsync({ ...data, admin_id: profile.id });
      toast.success('Recibo carregado com sucesso!');
      setUploadReciboOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar recibo');
    }
  }

  async function handleDeleteRecibo() {
    if (!deletingReciboId) return;
    try {
      await deleteRecibo.mutateAsync(deletingReciboId);
      toast.success('Recibo eliminado');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao eliminar recibo');
    } finally {
      setDeletingReciboId(null);
    }
  }

  const recibosProfile = tecnicos.find((t) => t.id === recibosId);
  const selectedProfile = tecnicos.find((t) => t.id === selectedId);

  const stats = useMemo(() => {
    const totalHoras = tecnicos.reduce((s, t) => s + t.totalHoras, 0);
    const ativos = tecnicos.filter((t) => t.is_active).length;
    return { total: tecnicos.length, totalHoras, ativos };
  }, [tecnicos]);

  const filteredTecnicos = useMemo(() => {
    let result = tecnicos;
    if (filterAtivo === 'ativo')   result = result.filter((t) => t.is_active);
    if (filterAtivo === 'inativo') result = result.filter((t) => !t.is_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.full_name.toLowerCase().includes(q));
    }
    return result;
  }, [tecnicos, filterAtivo, search]);

  const totalPages = Math.max(1, Math.ceil(filteredTecnicos.length / ITEMS_PER_PAGE));
  const paginatedTecnicos = useMemo(
    () => filteredTecnicos.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE),
    [filteredTecnicos, page]
  );

  return (
    <div className="h-full flex flex-col gap-3 lg:overflow-hidden">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Administração</p>
          <h1 className="text-xl font-black text-navy tracking-tight">Funcionários</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Chips */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
              <Users size={11} className="text-accent-blue shrink-0" />
              {isLoading ? '—' : stats.total} funcionários
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
              <Clock size={11} className="text-success shrink-0" />
              {isLoading ? '—' : fmtH(stats.totalHoras)} este mês
            </div>
          </div>
          {/* Botão novo */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-navy text-white text-[12px] font-bold hover:bg-navy-light transition-colors shadow-sm shadow-navy/20"
          >
            <UserPlus size={13} />
            Novo Funcionário
          </button>
        </div>
      </div>

      {/* ── Pesquisa ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar por nome..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full h-10 pl-10 pr-9 rounded-xl border border-gray-border bg-white text-sm text-gray-text placeholder:text-gray-muted/50 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30 transition-all"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(0); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-muted hover:text-gray-text transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Filtro + contador ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="inline-flex items-center bg-gray-100 rounded-xl p-[3px] gap-[2px]">
          {([
            { v: 'todos',   l: 'Todos'    },
            { v: 'ativo',   l: 'Ativos'   },
            { v: 'inativo', l: 'Inativos' },
          ] as { v: 'todos' | 'ativo' | 'inativo'; l: string }[]).map(({ v, l }) => (
            <button
              key={v}
              onClick={() => { setFilterAtivo(v); setPage(0); }}
              className={`h-[30px] px-3 rounded-[9px] text-[11px] font-semibold transition-all whitespace-nowrap ${
                filterAtivo === v
                  ? 'bg-white shadow-sm text-navy'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {!isLoading && (
          <p className="text-[11px] text-gray-muted shrink-0">
            <span className="font-black text-navy">{filteredTecnicos.length}</span> funcionário{filteredTecnicos.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Grid de cards ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          /* Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gray-200/80" />
                <div className="pl-5 pr-4 pt-4 pb-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Sk className="h-11 w-11 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Sk className="h-3.5 w-32" />
                      <Sk className="h-3 w-20" />
                    </div>
                    <Sk className="h-5 w-12 rounded-full shrink-0" />
                  </div>
                  <div className="border-t border-gray-border/70 pt-2.5 grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="space-y-1 text-center">
                        <Sk className="h-2.5 w-10 mx-auto" />
                        <Sk className="h-4 w-12 mx-auto" />
                      </div>
                    ))}
                  </div>
                  <Sk className="h-1.5 w-full rounded-full" />
                  <div className="flex gap-2 border-t border-gray-border/70 pt-2.5">
                    <Sk className="h-8 flex-1 rounded-lg" />
                    <Sk className="h-8 w-8 rounded-lg shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTecnicos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Users size={22} className="text-gray-muted/50" />
            </div>
            <p className="text-sm font-bold text-navy">
              {search ? 'Nenhum funcionário encontrado' : 'Sem funcionários registados'}
            </p>
            <p className="text-[12px] text-gray-muted mt-1">
              {search ? 'Tente outro termo de pesquisa.' : 'Crie o primeiro funcionário com o botão acima'}
            </p>
            <div className="flex gap-2 mt-2">
              {search && (
                <button className="text-xs text-accent-blue hover:underline font-medium" onClick={() => setSearch('')}>
                  Limpar pesquisa
                </button>
              )}
              {filterAtivo !== 'todos' && (
                <button className="text-xs text-accent-blue hover:underline font-medium" onClick={() => setFilterAtivo('todos')}>
                  Ver todos
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {paginatedTecnicos.map((tec) => {
              const pct = Math.min((tec.totalHoras / MAX_HORAS_MES) * 100, 100);
              const isOvertime = tec.totalHoras > MAX_HORAS_MES;
              const isActive = tec.is_active; // estado real da BD
              const hasHours = tec.totalHoras > 0;
              const barColor = !isActive ? 'bg-gray-300' : isOvertime ? 'bg-warning' : hasHours ? 'bg-success' : 'bg-accent-blue/40';
              const progColor = !isActive ? '#e2e8f0' : isOvertime ? '#FF9100' : hasHours ? '#00E676' : '#8B9FF4';

              return (
                <div
                  key={tec.id}
                  className={cn(
                    'relative bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow',
                    isActive ? 'border-gray-border' : 'border-gray-border/50 opacity-75'
                  )}
                >
                  <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', barColor)} />
                  <div className="pl-5 pr-4 pt-4 pb-3">

                    {/* ── Header: avatar + nome + badge ── */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-11 w-11 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-navy/10 ring-offset-1 ring-offset-white">
                        {tec.avatar_url
                          ? <img src={tec.avatar_url} alt={tec.full_name} className="w-full h-full object-cover object-center" />
                          : <span className="text-[11px] font-black text-white">{getInitials(tec.full_name)}</span>
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-navy leading-tight truncate">{tec.full_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {tec.obraAtual ? (
                            <div className="flex items-center gap-1 min-w-0">
                              <Building2 size={9} className="text-accent-blue shrink-0" />
                              <p className="text-[11px] text-accent-blue font-semibold truncate">{tec.obraAtual}</p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success/10 text-success text-[9px] font-bold leading-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                              Disponível
                            </span>
                          )}
                          {(tec as any).obrasAtivas > 1 && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue text-[9px] font-black leading-none">
                              +{(tec as any).obrasAtivas - 1}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        'shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide',
                        isActive
                          ? 'bg-success/10 border-success/25 text-success'
                          : 'bg-error/10 border-error/20 text-error'
                      )}>
                        {isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    {/* ── Horas: 3 colunas ── */}
                    <div className="border-t border-gray-border/70 pt-2.5 pb-2 grid grid-cols-3 divide-x divide-gray-border/60 text-center">
                      <div className="pr-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Normal</p>
                        <p className="text-[14px] font-black text-navy tabular-nums leading-tight">{fmtH(tec.horasNormais)}</p>
                      </div>
                      <div className="px-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Extra</p>
                        <p className={cn(
                          'text-[14px] font-black tabular-nums leading-tight',
                          tec.horasExtras > 0 ? 'text-warning' : 'text-gray-300'
                        )}>
                          {fmtH(tec.horasExtras)}
                        </p>
                      </div>
                      <div className="pl-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Total</p>
                        <p className={cn(
                          'text-[14px] font-black tabular-nums leading-tight',
                          isOvertime ? 'text-warning' : 'text-navy'
                        )}>
                          {fmtH(tec.totalHoras)}
                        </p>
                      </div>
                    </div>

                    {/* ── Barra de progresso mensal ── */}
                    <div className="mt-2 mb-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] text-gray-muted font-semibold">Ocupação mensal</p>
                        <p className={cn('text-[9px] font-black', isOvertime ? 'text-warning' : 'text-gray-muted')}>
                          {Math.round(pct)}%{isOvertime && ' ⚠'}
                        </p>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: progColor }}
                        />
                      </div>
                    </div>

                    {/* ── Acções ── */}
                    <div className="border-t border-gray-border/70 mt-3 pt-2.5 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedId(tec.id)}
                        disabled={!isActive}
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-navy/5 border border-navy/10 text-[12px] font-semibold text-navy hover:bg-navy hover:text-white hover:border-transparent transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-navy/5 disabled:hover:text-navy disabled:hover:border-navy/10"
                      >
                        <ClipboardList size={12} />
                        Apontamentos
                      </button>
                      <button
                        onClick={() => setRecibosId(tec.id)}
                        title="Recibos de ordenado"
                        className="h-8 w-8 rounded-lg bg-gray-100 text-gray-muted hover:bg-accent-blue/10 hover:text-accent-blue transition-colors flex items-center justify-center shrink-0"
                      >
                        <Receipt size={13} />
                      </button>
                      <button
                        onClick={() => setEditingTec(tec)}
                        title="Editar funcionário"
                        className="h-8 w-8 rounded-lg bg-gray-100 text-gray-muted hover:bg-gray-200 hover:text-navy transition-colors flex items-center justify-center shrink-0"
                      >
                        <Pencil size={13} />
                      </button>
                      {/* Toggle ativo/inativo */}
                      <button
                        onClick={() => toggleAtivo.mutate({ id: tec.id, is_active: !tec.is_active })}
                        disabled={toggleAtivo.isPending}
                        title={isActive ? 'Desactivar funcionário' : 'Activar funcionário'}
                        className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-50',
                          isActive
                            ? 'bg-warning/10 text-warning hover:bg-warning hover:text-white'
                            : 'bg-success/10 text-success hover:bg-success hover:text-white'
                        )}
                      >
                        <Power size={13} />
                      </button>
                      {/* Eliminar */}
                      <button
                        onClick={() => setDeletingId(tec.id)}
                        title="Eliminar funcionário"
                        className="h-8 w-8 rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all flex items-center justify-center shrink-0"
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

      {/* ── Paginação ─────────────────────────────────────────────────────── */}
      <div className={`shrink-0 flex items-center justify-between pt-3 border-t border-gray-border ${isLoading || filteredTecnicos.length === 0 || totalPages <= 1 ? 'invisible' : ''}`}>
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-border bg-white text-xs font-semibold text-gray-muted hover:text-navy hover:border-navy/30 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft size={13} /> Anterior
        </button>
        <p className="text-[11px] text-gray-muted">
          Página <span className="font-black text-navy">{page + 1}</span> de <span className="font-black text-navy">{totalPages}</span>
        </p>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-border bg-white text-xs font-semibold text-gray-muted hover:text-navy hover:border-navy/30 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          Seguinte <ChevronRight size={13} />
        </button>
      </div>

      {/* ── Modais ────────────────────────────────────────────────────────── */}
      <CreateUserModal open={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <EditTecnicoModal open={!!editingTec} tecnico={editingTec} onClose={() => setEditingTec(null)} />

      {/* Dialog recibos de ordenado */}
      <Dialog open={!!recibosId} onOpenChange={(o) => { if (!o) { setRecibosId(null); setUploadReciboOpen(false); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-gray-border shadow-xl">
          <DialogHeader className="px-5 py-4 border-b border-gray-border/60 shrink-0 flex-row items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Funcionário</p>
              <DialogTitle className="text-navy font-black text-[15px] tracking-tight mt-0.5">
                Recibos de Ordenado — {recibosProfile?.full_name ?? '—'}
              </DialogTitle>
            </div>
            <button
              onClick={() => setUploadReciboOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-navy text-white text-[12px] font-bold hover:bg-navy-light transition-colors shrink-0"
            >
              <PlusCircle size={12} />
              Carregar
            </button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {lRecibos ? (
              <div className="space-y-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-16 rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : tecnicoRecibos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Receipt size={22} className="text-gray-muted/50" />
                </div>
                <p className="text-sm font-bold text-navy">Sem recibos carregados</p>
                <p className="text-[12px] text-gray-muted mt-1">Clique em "Carregar" para adicionar o primeiro recibo</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tecnicoRecibos.map((recibo) => (
                  <div key={recibo.id} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-success" />
                    <div className="pl-4 pr-3 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-navy leading-tight">{recibo.periodo}</p>
                        <p className="text-[11px] text-gray-muted mt-0.5">
                          Bruto: <span className="font-semibold text-navy">{Number(recibo.valor_bruto).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</span>
                          {recibo.valor_liquido != null && (
                            <> · Líquido: <span className="font-semibold text-success">{Number(recibo.valor_liquido).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</span></>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-muted/70 mt-0.5">
                          {new Date(recibo.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={recibo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 w-8 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue hover:text-white transition-all flex items-center justify-center"
                          title="Abrir PDF"
                        >
                          <ExternalLink size={13} />
                        </a>
                        <button
                          onClick={() => setDeletingReciboId({ id: recibo.id, storagePath: recibo.storage_path })}
                          className="h-8 w-8 rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all flex items-center justify-center"
                          title="Eliminar recibo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal upload recibo */}
      <ReciboPagamentoModal
        open={uploadReciboOpen}
        onClose={() => setUploadReciboOpen(false)}
        tecnicos={tecnicos.filter((t) => t.role === 'tecnico') as any}
        defaultTecnicoId={recibosId ?? undefined}
        onSubmit={handleCreateRecibo}
        isSubmitting={createRecibo.isPending}
      />

      {/* Confirm eliminar recibo */}
      <ConfirmDialog
        open={!!deletingReciboId}
        onOpenChange={(o) => { if (!o) setDeletingReciboId(null); }}
        title="Eliminar Recibo"
        description="Tem a certeza que deseja eliminar este recibo de ordenado? O ficheiro PDF será removido permanentemente."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteRecibo}
        isLoading={deleteRecibo.isPending}
        variant="danger"
      />

      {/* Dialog apontamentos do funcionário */}
      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-gray-border shadow-xl">
          <DialogHeader className="px-5 py-4 border-b border-gray-border/60 shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Funcionário</p>
              <DialogTitle className="text-navy font-black text-[16px] tracking-tight mt-0.5">
                {selectedProfile?.full_name ?? '—'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <ApontamentosTable
              apontamentos={tecApts}
              onAprovar={(id) => updateStatus.mutate({ id, status: 'aprovado' })}
              onRejeitar={(id) => updateStatus.mutate({ id, status: 'rejeitado' })}
              showActions
              isLoading={lApts}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm eliminar funcionário */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => { if (!o) setDeletingId(null); }}
        title="Eliminar Funcionário"
        description={`Tem a certeza que deseja eliminar "${deletingFuncionario?.full_name}"?`}
        details="Esta ação é irreversível. Todos os dados associados a este funcionário poderão ser afectados."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        isLoading={deleteFuncionario.isPending}
        variant="danger"
      />
    </div>
  );
}
