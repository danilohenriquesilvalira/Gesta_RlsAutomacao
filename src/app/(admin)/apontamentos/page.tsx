'use client';

import { useState, useMemo } from 'react';
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
  X, ChevronLeft, ChevronRight,
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
  };

  const clearFilters = () => {
    setFilters({ tecnicoId: '', obraId: '', status: '', dataInicio: '', dataFim: '' });
    setPage(1);
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

  // Números de página a mostrar (máx 7)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, 6, 7];
    if (page >= totalPages - 3) return Array.from({ length: 7 }, (_, i) => totalPages - 6 + i);
    return Array.from({ length: 7 }, (_, i) => page - 3 + i);
  }, [page, totalPages]);

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

        {/* Info bar */}
        <div className="shrink-0 px-4 py-2 border-b border-gray-border/60 flex items-center justify-between bg-gray-bg/30">
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
        </div>

        {/* Tabela com scroll */}
        <div className="flex-1 overflow-auto">
          <ApontamentosTable
            apontamentos={paginated}
            onAprovar={(id) => updateStatus.mutate({ id, status: 'aprovado' })}
            onRejeitar={(id) => updateStatus.mutate({ id, status: 'rejeitado' })}
            showActions
            onViewFotos={(fotos) => setFotoModal(fotos)}
            isLoading={isLoading}
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
