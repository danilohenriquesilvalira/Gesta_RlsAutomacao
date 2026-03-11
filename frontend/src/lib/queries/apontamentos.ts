import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Apontamento, TipoHora } from '@/types';

export function useApontamentos(filters?: {
  tecnicoId?: string;
  obraId?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['apontamentos', filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.tecnicoId) params.set('tecnico_id', filters.tecnicoId);
      if (filters?.obraId)    params.set('obra_id', filters.obraId);
      if (filters?.status)    params.set('status', filters.status);
      if (filters?.dataInicio) params.set('data_inicio', filters.dataInicio);
      if (filters?.dataFim)   params.set('data_fim', filters.dataFim);
      const qs = params.toString();
      return api.get<Apontamento[]>(`/api/apontamentos${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useApontamentosHoje(tecnicoId?: string) {
  const today = new Date().toISOString().split('T')[0];
  return useApontamentos({ tecnicoId, dataInicio: today, dataFim: today });
}

export function useCreateApontamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      tecnico_id: string;
      obra_id: string | null;
      tipo_servico: string;
      tipo_hora: TipoHora;
      hora_entrada: string;
      hora_saida?: string;
      total_horas?: number;
      descricao?: string;
      data_apontamento: string;
      fotos_base64?: string[];
    }) => api.post<Apontamento>('/api/apontamentos', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apontamentos'] }),
  });
}

export function useUpdateApontamentoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, nota_rejeicao }: {
      id: string; status: string; nota_rejeicao?: string | null;
    }) => api.patch(`/api/apontamentos/${id}/status`, { status, nota_rejeicao }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apontamentos'] }),
  });
}

export function useUpdateApontamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string; obra_id: string | null; tipo_servico: string;
      tipo_hora: TipoHora; hora_entrada: string; hora_saida: string;
      total_horas: number; descricao?: string;
    }) => api.patch(`/api/apontamentos/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apontamentos'] }),
  });
}

export function useDeleteApontamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/apontamentos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apontamentos'] }),
  });
}
