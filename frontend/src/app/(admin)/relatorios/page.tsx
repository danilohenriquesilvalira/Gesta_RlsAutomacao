'use client';

import { useState, useMemo } from 'react';
import { useApontamentos } from '@/lib/queries/apontamentos';
import { useObras } from '@/lib/queries/obras';
import { useTecnicos } from '@/lib/queries/tecnicos';
import { useDespesas, useDepositos } from '@/lib/queries/despesas';
import { ApontamentosTable } from '@/components/admin/ApontamentosTable';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ClipboardList, Clock, TrendingUp, AlertCircle,
  FileDown, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

function fmtH(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

export default function RelatoriosPage() {
  const [filters, setFilters] = useState({
    tecnicoId: '',
    obraId: '',
    status: '',
    dataInicio: '',
    dataFim: '',
  });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [fotoModal, setFotoModal] = useState<string[] | null>(null);

  const { data: apontamentos = [], isLoading } = useApontamentos({
    tecnicoId: filters.tecnicoId || undefined,
    obraId: filters.obraId || undefined,
    status: filters.status || undefined,
    dataInicio: filters.dataInicio || undefined,
    dataFim: filters.dataFim || undefined,
  });
  const { data: obras = [] }     = useObras();
  const { data: tecnicos = [] }   = useTecnicos();
  const { data: despesas = [] }   = useDespesas();
  const { data: depositos = [] }  = useDepositos();

  const hasFilters = Object.values(filters).some(Boolean);

  const handleFilter = (key: string, value: string) => {
    setFilters((p) => ({ ...p, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ tecnicoId: '', obraId: '', status: '', dataInicio: '', dataFim: '' });
    setPage(1);
  };

  // ── Stats (calculadas sobre apontamentos filtrados) ──
  const stats = useMemo(() => {
    const aprovados = apontamentos.filter((a) => a.status === 'aprovado');
    const totalHoras = aprovados.reduce((s, a) => s + (a.total_horas ?? 0), 0);
    const horasNormais = aprovados
      .filter((a) => a.tipo_hora === 'normal')
      .reduce((s, a) => s + (a.total_horas ?? 0), 0);
    const horasExtras = totalHoras - horasNormais;
    const pendentes = apontamentos.filter((a) => a.status === 'pendente').length;
    return { total: apontamentos.length, totalHoras, horasNormais, horasExtras, pendentes };
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

  async function handleExport() {
    setExporting(true);
    try {
      const { generateExcel } = await import('@/lib/utils/exportExcel');
      const buffer = await generateExcel(apontamentos, despesas, depositos, tecnicos);
      const blob = new Blob([buffer as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-gestao-rls-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-3 lg:overflow-hidden">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Administração</p>
          <h1 className="text-xl font-black text-navy tracking-tight">Relatórios</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Chips de resumo */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
              <ClipboardList size={11} className="text-accent-blue shrink-0" />
              {isLoading ? '—' : stats.total} registos
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
              <Clock size={11} className="text-success shrink-0" />
              {isLoading ? '—' : fmtH(stats.totalHoras)} aprovadas
            </div>
          </div>
          {/* Exportar */}
          <button
            onClick={handleExport}
            disabled={exporting || apontamentos.length === 0}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-success text-white text-[12px] font-bold hover:bg-emerald-600 transition-colors shadow-sm shadow-success/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={13} />
            {exporting ? 'A exportar...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          {
            label: 'Total Registos',
            value: isLoading ? '—' : stats.total,
            icon: <ClipboardList size={13} />,
            accent: 'bg-accent-blue',
            iconBg: 'bg-blue-50 text-accent-blue',
          },
          {
            label: 'Horas Aprovadas',
            value: isLoading ? '—' : fmtH(stats.totalHoras),
            icon: <Clock size={13} />,
            accent: 'bg-success',
            iconBg: 'bg-emerald-50 text-success',
          },
          {
            label: 'Horas Extra',
            value: isLoading ? '—' : fmtH(stats.horasExtras),
            icon: <TrendingUp size={13} />,
            accent: stats.horasExtras > 0 ? 'bg-warning' : 'bg-gray-300',
            iconBg: stats.horasExtras > 0 ? 'bg-amber-50 text-warning' : 'bg-gray-100 text-gray-400',
          },
          {
            label: 'Pendentes',
            value: isLoading ? '—' : stats.pendentes,
            icon: <AlertCircle size={13} />,
            accent: stats.pendentes > 0 ? 'bg-warning' : 'bg-gray-300',
            iconBg: stats.pendentes > 0 ? 'bg-amber-50 text-warning' : 'bg-gray-100 text-gray-400',
          },
        ].map((k, i) => (
          <div key={i} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${k.accent}`} />
            <div className="pl-4 pr-3 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted leading-tight">{k.label}</p>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${k.iconBg}`}>{k.icon}</div>
              </div>
              <p className="font-black text-navy leading-none text-[18px]">{k.value}</p>
            </div>
          </div>
        ))}
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
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Todos" /></SelectTrigger>
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
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Todas" /></SelectTrigger>
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
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Todos" /></SelectTrigger>
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
                <span className="font-black text-navy">{stats.total}</span> apontamentos
                {hasFilters && <span className="text-accent-blue font-semibold"> · filtrado</span>}
                {stats.pendentes > 0 && (
                  <span className="text-warning font-semibold"> · {stats.pendentes} pendentes</span>
                )}
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
            showActions={false}
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
