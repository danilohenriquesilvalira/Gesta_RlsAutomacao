'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Obra, ObraStatus } from '@/types';

export function useObras(status?: ObraStatus, createdBy?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['obras', status, createdBy ?? null],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('obras')
        .select('*, executante:profiles!created_by(full_name), obra_tecnicos(tecnico:profiles!tecnico_id(id,full_name,avatar_url))')
        .not('created_by', 'is', null)   // exclui registos sem responsável
        .order('created_at', { ascending: false });
      if (status)    query = query.eq('status', status);
      if (createdBy) query = query.eq('created_by', createdBy);
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
      const { data, error } = await supabase
        .from('obras')
        .select('*, executante:profiles!created_by(full_name), obra_tecnicos(tecnico:profiles!tecnico_id(id,full_name,avatar_url))')
        .eq('id', id)
        .single();
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
      orcamento?: number | null;
      created_by?: string;
      localizacao?: string;
      lat?: number;
      lng?: number;
      tecnico_ids?: string[];
    }) => {
      const supabase = createClient();
      const { tecnico_ids, ...obraData } = data;
      const { data: inserted, error } = await supabase
        .from('obras')
        .insert(obraData)
        .select()
        .single();
      if (error) throw error;
      if (tecnico_ids?.length && inserted) {
        const rows = tecnico_ids.map((tid) => ({ obra_id: inserted.id, tecnico_id: tid }));
        const { error: err2 } = await supabase.from('obra_tecnicos').insert(rows);
        if (err2) throw err2;
      }
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
    mutationFn: async ({ id, executante, obra_tecnicos, tecnico_ids, ...data }: Partial<Obra> & { id: string; tecnico_ids?: string[] }) => {
      const supabase = createClient();
      const { data: updated, error } = await supabase
        .from('obras')
        .update(data)
        .eq('id', id)
        .select();
      if (error) throw error;
      if (!updated || updated.length === 0) throw new Error('Sem permissão para editar esta obra');
      if (tecnico_ids !== undefined) {
        await supabase.from('obra_tecnicos').delete().eq('obra_id', id);
        if (tecnico_ids.length > 0) {
          const rows = tecnico_ids.map((tid) => ({ obra_id: id, tecnico_id: tid }));
          const { error: err2 } = await supabase.from('obra_tecnicos').insert(rows);
          if (err2) throw err2;
        }
      }
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
      const { data, error } = await supabase
        .from('obras')
        .delete()
        .eq('id', id)
        .select();
      if (error) throw error;
      // Se RLS bloquear, Supabase não lança erro — verifica se algo foi apagado
      if (!data || data.length === 0) {
        throw new Error('Sem permissão para eliminar esta obra. Contacte o administrador.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}

/**
 * Retorna TODAS as obras em que o técnico está envolvido:
 * - obras que criou (created_by = tecnicoId)
 * - obras onde está listado em obra_tecnicos
 */
export function useMinhasObras(tecnicoId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['obras', 'minhas', tecnicoId],
    enabled: (options?.enabled ?? true) && !!tecnicoId,
    queryFn: async () => {
      const supabase = createClient();

      // 1. obras em que é participante via obra_tecnicos
      const { data: participacoes } = await supabase
        .from('obra_tecnicos')
        .select('obra_id')
        .eq('tecnico_id', tecnicoId);

      const partIds = (participacoes ?? []).map((p: any) => p.obra_id as string);

      // 2. query com OR: criadas por ele OU participante
      let q = supabase
        .from('obras')
        .select('*, executante:profiles!created_by(full_name), obra_tecnicos(tecnico:profiles!tecnico_id(id,full_name,avatar_url))')
        .order('created_at', { ascending: false });

      if (partIds.length > 0) {
        q = q.or(`created_by.eq.${tecnicoId},id.in.(${partIds.join(',')})`);
      } else {
        q = q.eq('created_by', tecnicoId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Obra[];
    },
  });
}
