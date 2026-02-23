'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useDespesas, useCreateDespesa, useUpdateDespesa, useDeleteDespesa } from '@/lib/queries/despesas';
import { useObras } from '@/lib/queries/obras';
import { DespesaModal } from '@/components/tecnico/DespesaModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Despesa, DespesaStatus, TipoDespesa } from '@/types';
import type { ReciboFile } from '@/components/tecnico/ReciboUpload';

function getStatusBadge(status: DespesaStatus) {
  switch (status) {
    case 'pendente':
      return <Badge className="border-amber-200 bg-amber-50 text-amber-700 font-bold text-[10px]">Pendente</Badge>;
    case 'aprovada':
      return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-[10px]">Aprovada</Badge>;
    case 'rejeitada':
      return <Badge className="border-red-200 bg-red-50 text-red-700 font-bold text-[10px]">Rejeitada</Badge>;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
}

function formatMonth(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    month: 'long', year: 'numeric',
  });
}

export default function MinhasDespesasPage() {
  const { profile } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editDespesa, setEditDespesa] = useState<Despesa | null>(null);
  const [viewDespesa, setViewDespesa] = useState<Despesa | null>(null);
  const [deleteDespesa, setDeleteDespesa] = useState<Despesa | null>(null);

  const { data: despesas = [], isLoading } = useDespesas(
    profile ? { tecnicoId: profile.id } : undefined
  );
  const { data: obras = [] } = useObras();
  const createDespesa = useCreateDespesa();
  const updateDespesa = useUpdateDespesa();
  const deleteDespesaMutation = useDeleteDespesa();

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

  // Agrupar por mês
  const grouped = despesas.reduce<Record<string, Despesa[]>>((acc, d) => {
    const month = d.data_despesa.slice(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">As Minhas Despesas</h1>
          <p className="text-sm text-gray-muted">Registo de despesas de campo</p>
        </div>
        <Button className="bg-navy hover:bg-navy-light text-white" onClick={() => setModalOpen(true)}>
          + Nova Despesa
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-center text-gray-muted py-12">Nenhuma despesa registada</p>
      ) : (
        Object.entries(grouped).map(([month, items]) => (
          <div key={month}>
            <h2 className="text-sm font-semibold text-gray-muted mb-2 capitalize">
              {formatMonth(month + '-01')}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {items.map((despesa) => (
                <div
                  key={despesa.id}
                  className="rounded-xl border border-gray-border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-muted capitalize">
                          {despesa.tipo_despesa}
                        </span>
                        {getStatusBadge(despesa.status)}
                      </div>
                      <p className="text-sm font-bold text-navy truncate">
                        {despesa.obra?.nome || 'Oficina'}
                      </p>
                      {despesa.descricao && (
                        <p className="text-xs text-gray-muted mt-0.5 truncate">{despesa.descricao}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-navy">
                        {Number(despesa.valor).toFixed(2)} €
                      </p>
                      <p className="text-[11px] text-gray-muted mt-0.5">
                        {formatDate(despesa.data_despesa)}
                      </p>
                    </div>
                  </div>

                  {/* Acções */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-border">
                    {/* Ver recibos */}
                    <button
                      onClick={() => setViewDespesa(despesa)}
                      className="flex items-center gap-1 text-xs text-accent-blue hover:underline"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                      {despesa.recibos?.length ?? 0} recibo(s)
                    </button>

                    {/* Editar e Apagar — só pendentes */}
                    {despesa.status === 'pendente' && (
                      <>
                        <span className="text-gray-border">·</span>
                        <button
                          onClick={() => setEditDespesa(despesa)}
                          className="flex items-center gap-1 text-xs text-gray-muted hover:text-navy"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                          Editar
                        </button>
                        <span className="text-gray-border">·</span>
                        <button
                          onClick={() => setDeleteDespesa(despesa)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                          Apagar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

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
                <p className="flex items-center gap-1"><span className="font-medium">Estado:</span> {getStatusBadge(viewDespesa.status)}</p>
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
      <Dialog open={!!deleteDespesa} onOpenChange={(o) => !o && setDeleteDespesa(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-navy font-bold">Apagar Despesa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-muted">
            Tens a certeza que queres apagar esta despesa de{' '}
            <span className="font-bold text-navy">
              {deleteDespesa ? Number(deleteDespesa.valor).toFixed(2) + ' €' : ''}
            </span>?
            Esta acção não pode ser desfeita.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteDespesa(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteDespesaMutation.isPending}
              onClick={handleDelete}
            >
              {deleteDespesaMutation.isPending ? 'A apagar...' : 'Apagar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
