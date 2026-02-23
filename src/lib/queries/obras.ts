'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Obra, ObraStatus } from '@/types';

export function useObras(status?: ObraStatus) {
  return useQuery({
    queryKey: ['obras', status],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase.from('obras').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return data as Obra[];
    },
  });
}

export function useObra(id: string) {
  return useQuery({
    queryKey: ['obras', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('obras').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Obra;
    },
    enabled: !!id,
  });
}

export function useCreateObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      codigo: string;
      nome: string;
      cliente: string;
      prazo?: string;
      created_by?: string;
    }) => {
      const supabase = createClient();
      const { data: inserted, error } = await supabase
        .from('obras')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}

export function useUpdateObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Obra> & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from('obras').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}

export function useDeleteObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('obras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}
