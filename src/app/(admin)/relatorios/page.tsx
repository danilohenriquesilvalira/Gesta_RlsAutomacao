'use client';

import { useState } from 'react';
import { useApontamentos } from '@/lib/queries/apontamentos';
import { useObras } from '@/lib/queries/obras';
import { useTecnicos } from '@/lib/queries/tecnicos';
import { ApontamentosTable } from '@/components/admin/ApontamentosTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function RelatoriosPage() {
  const [filters, setFilters] = useState({
    tecnicoId: '',
    obraId: '',
    dataInicio: '',
    dataFim: '',
  });
  const [exporting, setExporting] = useState(false);

  const { data: apontamentos = [] } = useApontamentos({
    tecnicoId: filters.tecnicoId || undefined,
    obraId: filters.obraId || undefined,
    dataInicio: filters.dataInicio || undefined,
    dataFim: filters.dataFim || undefined,
  });
  const { data: obras = [] } = useObras();
  const { data: tecnicos = [] } = useTecnicos();

  const totalHoras = apontamentos.reduce((s, a) => s + (a.total_horas ?? 0), 0);
  const horasNormais = apontamentos
    .filter((a) => a.tipo_hora === 'normal')
    .reduce((s, a) => s + (a.total_horas ?? 0), 0);
  const horasExtras = totalHoras - horasNormais;

  async function handleExport() {
    setExporting(true);
    try {
      const { generateExcel } = await import('@/lib/utils/exportExcel');
      const buffer = await generateExcel(apontamentos);
      const blob = new Blob([buffer as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-fieldsync-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">Relatórios</h1>
          <p className="text-gray-muted text-xs sm:text-sm">
            Filtre e exporte apontamentos
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="bg-success hover:bg-success/90 text-white shrink-0 text-sm"
          disabled={exporting || apontamentos.length === 0}
        >
          {exporting ? 'Exportando...' : 'Exportar Excel'}
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-border p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-gray-muted">Técnico</Label>
            <Select
              value={filters.tecnicoId}
              onValueChange={(v) =>
                setFilters((p) => ({ ...p, tecnicoId: v === 'all' ? '' : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tecnicos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-gray-muted">Obra</Label>
            <Select
              value={filters.obraId}
              onValueChange={(v) =>
                setFilters((p) => ({ ...p, obraId: v === 'all' ? '' : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {obras.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.codigo} — {o.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-gray-muted">Data Início</Label>
            <Input
              type="date"
              value={filters.dataInicio}
              onChange={(e) =>
                setFilters((p) => ({ ...p, dataInicio: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-gray-muted">Data Fim</Label>
            <Input
              type="date"
              value={filters.dataFim}
              onChange={(e) =>
                setFilters((p) => ({ ...p, dataFim: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-gray-border p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-muted">Total Horas</p>
          <p className="text-xl sm:text-2xl font-bold text-navy">{totalHoras.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-border p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-muted">Horas Normais</p>
          <p className="text-xl sm:text-2xl font-bold text-accent-blue">{horasNormais.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-border p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-muted">Horas Extras</p>
          <p className="text-xl sm:text-2xl font-bold text-warning">{horasExtras.toFixed(1)}h</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-border bg-white overflow-x-auto">
        <ApontamentosTable apontamentos={apontamentos} />
      </div>
    </div>
  );
}
