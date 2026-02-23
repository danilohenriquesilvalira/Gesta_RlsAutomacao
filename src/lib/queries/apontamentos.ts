'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Apontamento, TipoHora } from '@/types';

export function useApontamentos(filters?: {
  tecnicoId?: string;
  obraId?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
}) {
  return useQuery({
    queryKey: ['apontamentos', filters],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('apontamentos')
        .select('*, tecnico:profiles!tecnico_id(*), obra:obras!obra_id(*), fotos(*)')
        .order('data_apontamento', { ascending: false })
        .order('hora_entrada', { ascending: false });

      if (filters?.tecnicoId) query = query.eq('tecnico_id', filters.tecnicoId);
      if (filters?.obraId) query = query.eq('obra_id', filters.obraId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.dataInicio) query = query.gte('data_apontamento', filters.dataInicio);
      if (filters?.dataFim) query = query.lte('data_apontamento', filters.dataFim);

      const { data, error } = await query;
      if (error) throw error;
      return data as Apontamento[];
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
    mutationFn: async (data: {
      tecnico_id: string;
      obra_id: string;
      tipo_servico: string;
      tipo_hora: TipoHora;
      hora_entrada: string;
      hora_saida?: string;
      total_horas?: number;
      descricao?: string;
      data_apontamento: string;
      fotos_base64?: string[];
    }) => {
      const supabase = createClient();
      const { fotos_base64, ...aptData } = data;

      const { data: inserted, error } = await supabase
        .from('apontamentos')
        .insert({
          ...aptData,
          synced_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Upload photos
      if (fotos_base64?.length && inserted) {
        for (let i = 0; i < fotos_base64.length; i++) {
          const base64 = fotos_base64[i];
          const byteString = atob(base64.split(',')[1] || base64);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let j = 0; j < byteString.length; j++) {
            ia[j] = byteString.charCodeAt(j);
          }
          const blob = new Blob([ab], { type: 'image/jpeg' });

          const path = `fotos/${data.tecnico_id}/${data.data_apontamento}/${inserted.id}_${i}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('fotos')
            .upload(path, blob);

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(path);
            await supabase.from('fotos').insert({
              apontamento_id: inserted.id,
              storage_path: path,
              url: urlData.publicUrl,
            });
          }
        }
      }

      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apontamentos'] });
    },
  });
}

export function useUpdateApontamentoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('apontamentos')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apontamentos'] });
    },
  });
}
