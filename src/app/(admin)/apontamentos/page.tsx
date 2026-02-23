'use client';

import { useState } from 'react';
import { ApontamentosTable } from '@/components/admin/ApontamentosTable';
import {
  useApontamentos,
  useUpdateApontamentoStatus,
} from '@/lib/queries/apontamentos';
import { useObras } from '@/lib/queries/obras';
import { useTecnicos } from '@/lib/queries/tecnicos';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ApontamentosPage() {
  const [filters, setFilters] = useState({
    tecnicoId: '',
    obraId: '',
    status: '',
    dataInicio: '',
    dataFim: '',
  });
  const [fotoModal, setFotoModal] = useState<string[] | null>(null);

  const { data: apontamentos = [] } = useApontamentos({
    tecnicoId: filters.tecnicoId || undefined,
    obraId: filters.obraId || undefined,
    status: filters.status || undefined,
    dataInicio: filters.dataInicio || undefined,
    dataFim: filters.dataFim || undefined,
  });
  const { data: obras = [] } = useObras();
  const { data: tecnicos = [] } = useTecnicos();
  const updateStatus = useUpdateApontamentoStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-navy">Apontamentos</h1>
        <p className="text-gray-muted text-xs sm:text-sm">
          Gerencie todos os apontamentos dos técnicos
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-border p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
            <Label className="text-xs text-gray-muted">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(v) =>
                setFilters((p) => ({ ...p, status: v === 'all' ? '' : v }))
              }
            >
              <SelectTrigger>
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

      {/* Table */}
      <div className="rounded-xl border border-gray-border bg-white overflow-x-auto">
        <ApontamentosTable
          apontamentos={apontamentos}
          onAprovar={(id) => updateStatus.mutate({ id, status: 'aprovado' })}
          onRejeitar={(id) => updateStatus.mutate({ id, status: 'rejeitado' })}
          showActions
          onViewFotos={(fotos) => setFotoModal(fotos)}
        />
      </div>

      {/* Photo Lightbox */}
      <Dialog open={!!fotoModal} onOpenChange={() => setFotoModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fotos do Apontamento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {fotoModal?.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Foto ${i + 1}`}
                className="w-full rounded-lg object-cover aspect-square"
              />
            ))}
            {fotoModal?.length === 0 && (
              <p className="col-span-2 text-center text-gray-muted py-8">
                Nenhuma foto anexada
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
