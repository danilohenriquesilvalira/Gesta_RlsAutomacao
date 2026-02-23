'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  useDespesas,
  useUpdateDespesaStatus,
  useDepositos,
  useCreateDeposito,
} from '@/lib/queries/despesas';
import { useTecnicos } from '@/lib/queries/tecnicos';
import { useObras } from '@/lib/queries/obras';
import { DespesasTable } from '@/components/admin/DespesasTable';
import { DepositoModal } from '@/components/admin/DepositoModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DespesaStatus, Profile } from '@/types';

function formatCurrency(value: number) {
  return value.toFixed(2) + ' €';
}

export default function AdminDespesasPage() {
  const { profile } = useAuth();
  const [depositoModalOpen, setDepositoModalOpen] = useState(false);

  // Filters
  const [filterTecnico, setFilterTecnico] = useState<string>('');
  const [filterObra, setFilterObra] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const { data: despesas = [], isLoading: loadingDespesas } = useDespesas({
    tecnicoId: filterTecnico || undefined,
    obraId: filterObra || undefined,
    status: filterStatus ? (filterStatus as DespesaStatus) : undefined,
  });

  const { data: depositos = [], isLoading: loadingDepositos } = useDepositos();
  const { data: tecnicos = [] } = useTecnicos();
  const { data: obras = [] } = useObras();

  const updateStatus = useUpdateDespesaStatus();
  const createDeposito = useCreateDeposito();

  async function handleAprovar(id: string) {
    try {
      await updateStatus.mutateAsync({ id, status: 'aprovada' });
      toast.success('Despesa aprovada');
    } catch {
      toast.error('Erro ao aprovar despesa');
    }
  }

  async function handleRejeitar(id: string) {
    try {
      await updateStatus.mutateAsync({ id, status: 'rejeitada' });
      toast.success('Despesa rejeitada');
    } catch {
      toast.error('Erro ao rejeitar despesa');
    }
  }

  async function handleCreateDeposito(data: {
    tecnico_id: string;
    valor: number;
    data_deposito: string;
    descricao?: string;
  }) {
    if (!profile) return;
    try {
      await createDeposito.mutateAsync({
        ...data,
        admin_id: profile.id,
      });
      toast.success('Depósito registado com sucesso!');
      setDepositoModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registar depósito');
    }
  }

  // Build saldo table per tecnico
  const tecnicosSaldo = tecnicos
    .filter((t) => t.role === 'tecnico')
    .map((tecnico) => {
      const tecDepositos = depositos.filter((d) => d.tecnico_id === tecnico.id);
      const tecDespesas = despesas.filter(
        (d) => d.tecnico_id === tecnico.id && d.status === 'aprovada'
      );
      const totalDepositos = tecDepositos.reduce((s, d) => s + Number(d.valor), 0);
      const totalDespesas = tecDespesas.reduce((s, d) => s + Number(d.valor), 0);
      return {
        tecnico,
        totalDepositos,
        totalDespesas,
        saldo: totalDepositos - totalDespesas,
      };
    });

  const tecnicosTecnico = tecnicos.filter((t) => t.role === 'tecnico') as Profile[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Despesas</h1>
        <p className="text-sm text-gray-muted">Gestão de despesas e depósitos</p>
      </div>

      <Tabs defaultValue="despesas">
        <TabsList className="mb-4">
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="depositos">Depósitos &amp; Saldo</TabsTrigger>
        </TabsList>

        {/* ── Tab Despesas ── */}
        <TabsContent value="despesas" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select
              value={filterTecnico || 'all'}
              onValueChange={(v) => setFilterTecnico(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os técnicos</SelectItem>
                {tecnicosTecnico.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterObra || 'all'}
              onValueChange={(v) => setFilterObra(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Obra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as obras</SelectItem>
                {obras.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterStatus || 'all'}
              onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovada">Aprovada</SelectItem>
                <SelectItem value="rejeitada">Rejeitada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingDespesas ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="rounded-xl border border-gray-border overflow-hidden bg-white">
              <DespesasTable
                despesas={despesas}
                onAprovar={handleAprovar}
                onRejeitar={handleRejeitar}
              />
            </div>
          )}
        </TabsContent>

        {/* ── Tab Depósitos & Saldo ── */}
        <TabsContent value="depositos" className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-navy hover:bg-navy-light text-white"
              onClick={() => setDepositoModalOpen(true)}
            >
              + Registar Depósito
            </Button>
          </div>

          {loadingDepositos ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="rounded-xl border border-gray-border overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-border bg-gray-50/50">
                    <th className="text-left text-gray-muted font-medium px-6 py-3">Técnico</th>
                    <th className="text-right text-gray-muted font-medium px-4 py-3">Total Depositado</th>
                    <th className="text-right text-gray-muted font-medium px-4 py-3">Despesas Aprovadas</th>
                    <th className="text-right text-gray-muted font-medium px-6 py-3">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {tecnicosSaldo.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-gray-muted">
                        Nenhum técnico encontrado.
                      </td>
                    </tr>
                  ) : (
                    tecnicosSaldo.map(({ tecnico, totalDepositos, totalDespesas, saldo }) => (
                      <tr key={tecnico.id} className="border-b border-gray-border last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3 font-medium text-navy">{tecnico.full_name}</td>
                        <td className="px-4 py-3 text-right text-gray-text">
                          {formatCurrency(totalDepositos)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-text">
                          {formatCurrency(totalDespesas)}
                        </td>
                        <td className="px-6 py-3 text-right font-bold">
                          <span className={saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {formatCurrency(saldo)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DepositoModal
        open={depositoModalOpen}
        onClose={() => setDepositoModalOpen(false)}
        tecnicos={tecnicosTecnico}
        onSubmit={handleCreateDeposito}
        isSubmitting={createDeposito.isPending}
      />
    </div>
  );
}
