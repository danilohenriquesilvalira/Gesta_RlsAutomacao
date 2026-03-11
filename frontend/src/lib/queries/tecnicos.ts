import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Profile, Role } from '@/types';

export function useTecnicos() {
  return useQuery({
    queryKey: ['tecnicos'],
    queryFn: () => api.get<Profile[]>('/api/profiles'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password, fullName, role }: {
      email: string; password: string; fullName: string; role: Role;
    }) => api.post<Profile>('/api/profiles', { email, password, full_name: fullName, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
      queryClient.invalidateQueries({ queryKey: ['tecnicos-horas'] });
    },
  });
}

export function useToggleTecnicoAtivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/api/profiles/${id}/toggle-active`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
      queryClient.invalidateQueries({ queryKey: ['tecnicos-horas'] });
    },
  });
}

export function useUpdateTecnico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fullName, role }: { id: string; fullName: string; role: Role }) =>
      api.patch(`/api/profiles/${id}`, { full_name: fullName, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
      queryClient.invalidateQueries({ queryKey: ['tecnicos-horas'] });
    },
  });
}

export function useDeleteFuncionario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
      queryClient.invalidateQueries({ queryKey: ['tecnicos-horas'] });
    },
  });
}

export function useTecnico(id: string) {
  return useQuery({
    queryKey: ['tecnicos', id],
    queryFn: () => api.get<Profile>(`/api/profiles/${id}`),
    enabled: !!id,
  });
}

interface TecnicoComHoras extends Profile {
  horasNormais: number;
  horasExtras: number;
  totalHoras: number;
  obraAtual: string | null;
  obrasAtivas: number;
}

export function useTecnicosComHoras(mes?: string) {
  return useQuery({
    queryKey: ['tecnicos-horas', mes],
    queryFn: () => {
      const params = mes ? `?mes=${mes}` : '';
      return api.get<TecnicoComHoras[]>(`/api/profiles/tecnicos-horas${params}`);
    },
  });
}
