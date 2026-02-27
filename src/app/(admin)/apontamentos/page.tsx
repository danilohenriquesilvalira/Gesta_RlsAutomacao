'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useApontamentos, useUpdateApontamentoStatus } from '@/lib/queries/apontamentos';
import { useObras } from '@/lib/queries/obras';
import { useTecnicos } from '@/lib/queries/tecnicos';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ApontamentosTable } from '@/components/admin/ApontamentosTable';
import { cn } from '@/lib/utils';
import {
  ClipboardList, Clock, AlertCircle, CheckCircle2,
  X, ChevronLeft, ChevronRight, Check, XCircle,
} from 'lucide-react';

const PAGE_SIZE = 20;

function fmtH(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

export default function ApontamentosPage() {
  const [filters, setFilters] = useState({
    tecnicoId: '',
    obraId: '',
    status: '',
    dataInicio: '',
    dataFim: '',
  });
  const [page, setPage] = useState(1);
  const [fotoModal, setFotoModal] = useState<string[] | null>(null);

  // ── Seleção batch ──────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Diálogo de rejeição com nota ──────────────────────────────────────────
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; ids: string[]; nota: string }>({
    open: false, ids: [], nota: '',
  });
  const [rejectPending, setRejectPending] = useState(false);

  const { data: apontamentos = [], isLoading } = useApontamentos({
    tecnicoId: filters.tecnicoId || undefined,
    obraId: filters.obraId || undefined,
    status: filters.status || undefined,
    dataInicio: filters.dataInicio || undefined,
    dataFim: filters.dataFim || undefined,
  });
  const { data: obras = [] } = useObras();
  const { data: tecnicos = [] } = useTecnicos();
  const updateStatus = useUpdateApontamentoStatus();

  const hasFilters = Object.values(filters).some(Boolean);

  const handleFilter = (key: string, value: string) => {
    setFilters((p) => ({ ...p, [key]: value }));
    setPage(1);
    setSelectedIds([]);
  };

  const clearFilters = () => {
    setFilters({ tecnicoId: '', obraId: '', status: '', dataInicio: '', dataFim: '' });
    setPage(1);
    setSelectedIds([]);
  };

  // ── Stats (sobre resultados filtrados) ──
  const stats = useMemo(() => {
    const horasAprovadas = apontamentos
      .filter((a) => a.status === 'aprovado')
      .reduce((s, a) => s + (a.total_horas ?? 0), 0);
    const pendentes = apontamentos.filter((a) => a.status === 'pendente').length;
    const aprovados = apontamentos.filter((a) => a.status === 'aprovado').length;
    return { total: apontamentos.length, horasAprovadas, pendentes, aprovados };
  }, [apontamentos]);

  // ── Paginação ──
  const totalPages = Math.max(1, Math.ceil(apontamentos.length / PAGE_SIZE));
  const paginated = apontamentos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, 6, 7];
    if (page >= totalPages - 3) return Array.from({ length: 7 }, (_, i) => totalPages - 6 + i);
    return Array.from({ length: 7 }, (_, i) => page - 3 + i);
  }, [page, totalPages]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Aprovar único
  async function handleAprovar(id: string) {
    try {
      await updateStatus.mutateAsync({ id, status: 'aprovado' });
      toast.success('Apontamento aprovado');
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch {
      toast.error('Erro ao aprovar apontamento');
    }
  }

  // Rejeitar único — abre dialog
  function handleRejeitar(id: string) {
    setRejectDialog({ open: true, ids: [id], nota: '' });
  }

  // Aprovar batch
  async function handleBatchAprovar() {
    const ids = [...selectedIds];
    setSelectedIds([]);
    try {
      await Promise.all(ids.map((id) => updateStatus.mutateAsync({ id, status: 'aprovado' })));
      toast.success(`${ids.length} apontamento${ids.length > 1 ? 's' : ''} aprovado${ids.length > 1 ? 's' : ''}`);
    } catch {
      toast.error('Erro ao aprovar apontamentos');
    }
  }

  // Rejeitar batch — abre dialog
  function handleBatchRejeitar() {
    setRejectDialog({ open: true, ids: [...selectedIds], nota: '' });
  }

  // Confirmar rejeição (único ou batch)
  async function handleConfirmRejeitar() {
    const { ids, nota } = rejectDialog;
    setRejectPending(true);
    try {
      await Promise.all(
        ids.map((id) => updateStatus.mutateAsync({ id, status: 'rejeitado', nota_rejeicao: nota.trim() || null }))
      );
      toast.success(`${ids.length} apontamento${ids.length > 1 ? 's' : ''} rejeitado${ids.length > 1 ? 's' : ''}`);
      setSelectedIds((prev) => prev.filter((x) => !ids.includes(x)));
      setRejectDialog({ open: false, ids: [], nota: '' });
    } catch {
      toast.error('Erro ao rejeitar apontamentos');
    } finally {
      setRejectPending(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-3 lg:overflow-hidden">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Administração</p>
          <h1 className="text-xl font-black text-navy tracking-tight">Apontamentos</h1>
        </div>
        {/* Chips de resumo */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
            <ClipboardList size={11} className="text-accent-blue shrink-0" />
            {isLoading ? '—' : stats.total} registos
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
            <Clock size={11} className="text-success shrink-0" />
            {isLoading ? '—' : fmtH(stats.horasAprovadas)} aprovadas
          </div>
          {!isLoading && stats.pendentes > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/25 text-[11px] font-bold text-warning">
              <AlertCircle size={11} className="shrink-0" />
              {stats.pendentes} pendentes
            </div>
          )}
          {!isLoading && stats.pendentes === 0 && stats.total > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/25 text-[11px] font-bold text-success">
              <CheckCircle2 size={11} className="shrink-0" />
              Tudo em dia
            </div>
          )}
        </div>
      </div>

      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white rounded-xl border border-gray-border shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">

          <div className="flex-1 min-w-[130px] space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Funcionário</p>
            <Select
              value={filters.tecnicoId || 'all'}
              onValueChange={(v) => handleFilter('tecnicoId', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tecnicos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[130px] space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Obra</p>
            <Select
              value={filters.obraId || 'all'}
              onValueChange={(v) => handleFilter('obraId', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {obras.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.codigo} — {o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[130px] space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Estado</p>
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => handleFilter('status', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[140px] space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Data Início</p>
            <Input
              type="date"
              value={filters.dataInicio}
              onChange={(e) => handleFilter('dataInicio', e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>

          <div className="w-[140px] space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Data Fim</p>
            <Input
              type="date"
              value={filters.dataFim}
              onChange={(e) => handleFilter('dataFim', e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 h-9 px-3 self-end rounded-lg border border-gray-border text-[12px] font-semibold text-gray-muted hover:text-error hover:border-error/30 hover:bg-red-50 transition-colors"
            >
              <X size={12} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* ── Tabela ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">

        {/* Info bar / Batch action bar */}
        <div className="shrink-0 px-4 py-2 border-b border-gray-border/60 flex items-center justify-between bg-gray-bg/30">
          {selectedIds.length > 0 ? (
            /* Barra de ações batch */
            <div className="flex items-center gap-3 w-full">
              <span className="text-[11px] font-black text-accent-blue">
                {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleBatchAprovar}
                  className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-success/10 border border-success/25 text-success text-[12px] font-bold hover:bg-success hover:text-white transition-all"
                >
                  <Check size={12} />
                  Aprovar {selectedIds.length}
                </button>
                <button
                  onClick={handleBatchRejeitar}
                  className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-error/10 border border-error/25 text-error text-[12px] font-bold hover:bg-error hover:text-white transition-all"
                >
                  <XCircle size={12} />
                  Rejeitar {selectedIds.length}
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="flex items-center justify-center h-7 w-7 rounded-lg border border-gray-border text-gray-muted hover:text-navy transition-colors"
                  title="Cancelar seleção"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-gray-muted">
                {isLoading ? (
                  <span>A carregar...</span>
                ) : (
                  <>
                    <span className="font-black text-navy">{stats.total}</span>
                    {' '}apontamentos
                    {hasFilters && <span className="text-accent-blue font-semibold"> · filtrado</span>}
                  </>
                )}
              </p>
              {!isLoading && apontamentos.length > 0 && (
                <p className="text-[11px] text-gray-muted">
                  Pág. <span className="font-black text-navy">{page}</span>{' '}
                  de <span className="font-black text-navy">{totalPages}</span>
                  {' '}· {PAGE_SIZE} por página
                </p>
              )}
            </>
          )}
        </div>

        {/* Tabela com scroll */}
        <div className="flex-1 overflow-auto">
          <ApontamentosTable
            apontamentos={paginated}
            onAprovar={handleAprovar}
            onRejeitar={handleRejeitar}
            showActions
            onViewFotos={(fotos) => setFotoModal(fotos)}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>

        {/* Paginação */}
        {!isLoading && totalPages > 1 && (
          <div className="shrink-0 border-t border-gray-border/60 px-4 py-2.5 flex items-center justify-between bg-gray-bg/20">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-border text-[12px] font-semibold text-gray-muted hover:bg-white hover:text-navy disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={13} />
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-[12px] font-bold transition-colors',
                    page === n
                      ? 'bg-navy text-white shadow-sm'
                      : 'text-gray-muted hover:bg-white hover:text-navy'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-border text-[12px] font-semibold text-gray-muted hover:bg-white hover:text-navy disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            >
              Seguinte
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Dialog: Rejeitar com nota ──────────────────────────────────────── */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => !o && setRejectDialog({ open: false, ids: [], nota: '' })}>
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
              Indique o motivo da rejeição (opcional). O técnico poderá ver esta nota.
            </p>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Motivo / Nota</p>
              <textarea
                value={rejectDialog.nota}
                onChange={(e) => setRejectDialog((p) => ({ ...p, nota: e.target.value }))}
                placeholder="Ex: Horário incorrecto, faltam detalhes..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-gray-border bg-gray-bg text-[13px] text-gray-text placeholder:text-gray-muted/50 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/25 resize-none transition-all"
              />
            </div>
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
                className="flex-1 h-10 rounded-xl bg-error text-white text-[13px] font-bold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {rejectPending ? 'A rejeitar...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Lightbox de fotos ─────────────────────────────────────────────── */}
      <Dialog open={!!fotoModal} onOpenChange={() => setFotoModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-navy font-black">Fotos do Apontamento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {fotoModal?.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Foto ${i + 1}`}
                className="w-full rounded-xl object-cover aspect-square shadow-sm"
              />
            ))}
            {fotoModal?.length === 0 && (
              <p className="col-span-2 text-center text-gray-muted py-10 text-sm">
                Nenhuma foto anexada
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
