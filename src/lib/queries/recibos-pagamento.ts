'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ReciboPagamento } from '@/types';

export function useRecibosPagamento(tecnicoId?: string) {
  return useQuery({
    queryKey: ['recibos-pagamento', tecnicoId ?? null],
    enabled: tecnicoId !== '',
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('recibos_pagamento')
        .select('*, tecnico:profiles!tecnico_id(*)')
        .order('created_at', { ascending: false });

      if (tecnicoId) query = query.eq('tecnico_id', tecnicoId);

      const { data, error } = await query;
      if (error) throw error;
      return data as ReciboPagamento[];
    },
  });
}

export function useCreateReciboPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      tecnico_id: string;
      admin_id: string;
      periodo: string;
      valor_bruto: number;
      valor_liquido?: number | null;
      descricao?: string;
      file: File;
    }) => {
      const supabase = createClient();
      const { file, ...rowData } = data;

      const ext = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : (file.name.split('.').pop() ?? 'pdf');
      const path = `recibos/${data.tecnico_id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('recibos-pagamento')
        .upload(path, file, { contentType: file.type || 'application/pdf' });

      if (uploadError) throw new Error(`Erro ao carregar ficheiro: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('recibos-pagamento')
        .getPublicUrl(path);

      const { error } = await supabase.from('recibos_pagamento').insert({
        ...rowData,
        storage_path: path,
        url: urlData.publicUrl,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recibos-pagamento'] });
    },
  });
}

export function useDeleteReciboPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      const supabase = createClient();
      await supabase.storage.from('recibos-pagamento').remove([storagePath]);
      const { error } = await supabase.from('recibos_pagamento').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recibos-pagamento'] });
    },
  });
}
