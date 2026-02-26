'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Profile, Role } from '@/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useTecnicos() {
  return useQuery({
    queryKey: ['tecnicos'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'tecnico')
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
      role,
    }: {
      email: string;
      password: string;
      fullName: string;
      role: Role;
    }) => {
      // Create a dedicated client for signup to avoid logging out the admin
      const signupClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data, error } = await signupClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
      queryClient.invalidateQueries({ queryKey: ['tecnicos-horas'] });
    },
  });
}

export function useToggleTecnicoAtivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
      queryClient.invalidateQueries({ queryKey: ['tecnicos-horas'] });
    },
  });
}

export function useUpdateTecnico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      fullName,
      role,
    }: {
      id: string;
      fullName: string;
      role: Role;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, role })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
      queryClient.invalidateQueries({ queryKey: ['tecnicos-horas'] });
    },
  });
}

export function useDeleteFuncionario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc('delete_user_complete', { user_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
      queryClient.invalidateQueries({ queryKey: ['tecnicos-horas'] });
    },
  });
}

export function useTecnico(id: string) {
  return useQuery({
    queryKey: ['tecnicos', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!id,
  });
}

export function useTecnicosComHoras(mes?: string) {
  return useQuery({
    queryKey: ['tecnicos-horas', mes],
    queryFn: async () => {
      const supabase = createClient();

      const { data: tecnicos, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'tecnico')
        .order('full_name');

      if (error) throw error;

      const now = new Date();
      const year = mes ? parseInt(mes.split('-')[0]) : now.getFullYear();
      const month = mes ? parseInt(mes.split('-')[1]) - 1 : now.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data: apontamentos } = await supabase
        .from('apontamentos')
        .select('tecnico_id, total_horas, tipo_hora, obra_id, obras(nome)')
        .gte('data_apontamento', startDate)
        .lte('data_apontamento', endDate)
        .eq('status', 'aprovado');

      return (tecnicos as Profile[]).map((tec) => {
        const tecApts = apontamentos?.filter((a) => a.tecnico_id === tec.id) ?? [];
        const horasNormais = tecApts
          .filter((a) => a.tipo_hora === 'normal')
          .reduce((sum, a) => sum + (a.total_horas ?? 0), 0);
        const horasExtras = tecApts
          .filter((a) => a.tipo_hora !== 'normal')
          .reduce((sum, a) => sum + (a.total_horas ?? 0), 0);
        const obraAtual = tecApts.length > 0 ? (tecApts[0] as Record<string, unknown>).obras : null;

        return {
          ...tec,
          horasNormais,
          horasExtras,
          totalHoras: horasNormais + horasExtras,
          obraAtual: obraAtual ? (obraAtual as { nome: string }).nome : null,
        };
      });
    },
  });
}
