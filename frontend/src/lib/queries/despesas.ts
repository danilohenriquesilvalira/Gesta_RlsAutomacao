import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Despesa, Deposito, TipoDespesa, DespesaStatus } from '@/types';

export function useDespesas(filters?: {
  tecnicoId?: string; obraId?: string; status?: DespesaStatus;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['despesas', filters],
    enabled: options?.enabled ?? true,
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.tecnicoId) params.set('tecnico_id', filters.tecnicoId);
      if (filters?.obraId)    params.set('obra_id', filters.obraId);
      if (filters?.status)    params.set('status', filters.status);
      const qs = params.toString();
      return api.get<Despesa[]>(`/api/despesas${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useCreateDespesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      tecnico_id: string; obra_id?: string | null; tipo_despesa: TipoDespesa;
      descricao?: string; valor: number; data_despesa: string;
      ficheiros?: Array<{ base64: string; tipo: 'imagem' | 'pdf'; nome: string }>;
      participante_ids?: string[];
    }) => api.post<Despesa>('/api/despesas', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['despesas'] }),
  });
}

export function useUpdateDespesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string; tecnico_id: string; obra_id?: string | null;
      tipo_despesa: TipoDespesa; descricao?: string | null; valor: number;
      data_despesa: string;
      novos_ficheiros?: Array<{ base64: string; tipo: 'imagem' | 'pdf'; nome: string }>;
      participante_ids?: string[];
    }) => {
      const { id, ...body } = data;
      return api.patch(`/api/despesas/${id}`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['despesas'] }),
  });
}

export function useDeleteDespesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/despesas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['despesas'] }),
  });
}

export function useDeleteRecibo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; storagePath: string }) =>
      api.delete(`/api/recibos-despesas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['despesas'] }),
  });
}

export function useUpdateDespesaStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, nota_rejeicao }: {
      id: string; status: DespesaStatus; nota_rejeicao?: string | null;
    }) => api.patch(`/api/despesas/${id}/status`, { status, nota_rejeicao }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
      queryClient.invalidateQueries({ queryKey: ['depositos'] });
    },
  });
}

export function useDepositos(tecnicoId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['depositos', tecnicoId],
    enabled: options?.enabled ?? true,
    queryFn: () => {
      const params = tecnicoId ? `?tecnico_id=${tecnicoId}` : '';
      return api.get<Deposito[]>(`/api/depositos${params}`);
    },
  });
}

export function useCreateDeposito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      tecnico_id: string; admin_id: string; valor: number;
      descricao?: string; data_deposito: string;
    }) => api.post('/api/depositos', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['depositos'] }),
  });
}

export function useSaldoTecnico(tecnicoId: string | undefined) {
  const { data: depositos = [] } = useDepositos(tecnicoId, { enabled: !!tecnicoId });
  const { data: despesas = [] } = useDespesas(
    tecnicoId ? { tecnicoId } : undefined,
    { enabled: !!tecnicoId }
  );

  const totalDepositado = depositos.reduce((sum, d) => sum + Number(d.valor), 0);
  const totalDespesasAprovadas = despesas
    .filter((d) => d.status === 'aprovada')
    .reduce((sum, d) => sum + Number(d.valor), 0);

  return {
    totalDepositado,
    totalDespesasAprovadas,
    saldo: totalDepositado - totalDespesasAprovadas,
  };
}
