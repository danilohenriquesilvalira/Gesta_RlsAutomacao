import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Obra, ObraStatus } from '@/types';

export function useObras(status?: ObraStatus, createdBy?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['obras', status, createdBy ?? null],
    enabled: options?.enabled ?? true,
    queryFn: () => {
      const params = new URLSearchParams();
      if (status)    params.set('status', status);
      if (createdBy) params.set('created_by', createdBy);
      const qs = params.toString();
      return api.get<Obra[]>(`/api/obras${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useObra(id: string) {
  return useQuery({
    queryKey: ['obras', id],
    queryFn: () => api.get<Obra>(`/api/obras/${id}`),
    enabled: !!id,
  });
}

export function useCreateObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      codigo: string; nome: string; cliente: string; prazo?: string;
      orcamento?: number | null; created_by?: string; localizacao?: string;
      lat?: number; lng?: number; tecnico_ids?: string[];
    }) => api.post<Obra>('/api/obras', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['obras'] }),
  });
}

export function useUpdateObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, executante, obra_tecnicos, ...data }: Partial<Obra> & { id: string; tecnico_ids?: string[] }) =>
      api.patch(`/api/obras/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['obras'] }),
  });
}

export function useDeleteObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/obras/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['obras'] }),
  });
}

export function useMinhasObras(tecnicoId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['obras', 'minhas', tecnicoId],
    enabled: (options?.enabled ?? true) && !!tecnicoId,
    queryFn: () => api.get<Obra[]>(`/api/obras/minhas/${tecnicoId}`),
  });
}
