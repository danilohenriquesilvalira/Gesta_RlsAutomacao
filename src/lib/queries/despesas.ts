'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Despesa, Deposito, TipoDespesa, DespesaStatus } from '@/types';

// ── Despesas ──────────────────────────────────────────────────────────────────

export function useDespesas(filters?: {
  tecnicoId?: string;
  obraId?: string;
  status?: DespesaStatus;
}) {
  return useQuery({
    queryKey: ['despesas', filters],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('despesas')
        .select('*, tecnico:profiles!tecnico_id(*), obra:obras!obra_id(*), recibos:recibos_despesas(*)')
        .order('data_despesa', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.tecnicoId) query = query.eq('tecnico_id', filters.tecnicoId);
      if (filters?.obraId) query = query.eq('obra_id', filters.obraId);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as Despesa[];
    },
  });
}

export function useCreateDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      tecnico_id: string;
      obra_id?: string | null;
      tipo_despesa: TipoDespesa;
      descricao?: string;
      valor: number;
      data_despesa: string;
      ficheiros?: Array<{ base64: string; tipo: 'imagem' | 'pdf'; nome: string }>;
    }) => {
      const supabase = createClient();
      const { ficheiros, ...despesaData } = data;

      const { data: inserted, error } = await supabase
        .from('despesas')
        .insert(despesaData)
        .select()
        .single();

      if (error) throw error;

      // Upload receipts/files
      if (ficheiros?.length && inserted) {
        const extMap: Record<string, string> = {
          'image/jpeg': 'jpg', 'image/jpg': 'jpg',
          'image/png': 'png', 'image/webp': 'webp',
          'image/gif': 'gif', 'image/svg+xml': 'svg',
          'image/heic': 'heic', 'image/heif': 'heif',
          'application/pdf': 'pdf',
        };

        for (let i = 0; i < ficheiros.length; i++) {
          const ficheiro = ficheiros[i];

          // Extract real MIME type from data URL header (e.g. "data:image/png;base64,...")
          const mimeType = ficheiro.base64.startsWith('data:')
            ? ficheiro.base64.split(';')[0].replace('data:', '')
            : (ficheiro.tipo === 'pdf' ? 'application/pdf' : 'image/jpeg');

          const ext = extMap[mimeType] ?? (ficheiro.tipo === 'pdf' ? 'pdf' : 'jpg');

          // Convert base64 to blob preserving original format
          const base64Data = ficheiro.base64.includes(',')
            ? ficheiro.base64.split(',')[1]
            : ficheiro.base64;
          const byteString = atob(base64Data);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let j = 0; j < byteString.length; j++) {
            ia[j] = byteString.charCodeAt(j);
          }
          const blob = new Blob([ab], { type: mimeType });

          const path = `recibos/${data.tecnico_id}/${data.data_despesa}/${inserted.id}_${i}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('recibos')
            .upload(path, blob);

          if (uploadError) {
            console.error('Erro upload recibo:', uploadError.message);
            throw new Error(`Despesa guardada mas erro no upload do recibo: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('recibos')
            .getPublicUrl(path);

          await supabase.from('recibos_despesas').insert({
            despesa_id: inserted.id,
            storage_path: path,
            url: urlData.publicUrl,
            tipo_ficheiro: ficheiro.tipo,
          });
        }
      }

      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    },
  });
}

export function useUpdateDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      tecnico_id: string;
      obra_id?: string | null;
      tipo_despesa: TipoDespesa;
      descricao?: string | null;
      valor: number;
      data_despesa: string;
      novos_ficheiros?: Array<{ base64: string; tipo: 'imagem' | 'pdf'; nome: string }>;
    }) => {
      const supabase = createClient();
      const { id, novos_ficheiros, tecnico_id, ...updateData } = data;

      const { error } = await supabase
        .from('despesas')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Upload novos recibos se existirem
      if (novos_ficheiros?.length) {
        const extMap: Record<string, string> = {
          'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
          'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
          'image/heic': 'heic', 'application/pdf': 'pdf',
        };

        for (let i = 0; i < novos_ficheiros.length; i++) {
          const ficheiro = novos_ficheiros[i];
          const mimeType = ficheiro.base64.startsWith('data:')
            ? ficheiro.base64.split(';')[0].replace('data:', '')
            : (ficheiro.tipo === 'pdf' ? 'application/pdf' : 'image/jpeg');
          const ext = extMap[mimeType] ?? (ficheiro.tipo === 'pdf' ? 'pdf' : 'jpg');
          const base64Data = ficheiro.base64.includes(',') ? ficheiro.base64.split(',')[1] : ficheiro.base64;
          const byteString = atob(base64Data);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
          const blob = new Blob([ab], { type: mimeType });

          const path = `recibos/${tecnico_id}/${data.data_despesa}/${id}_edit_${Date.now()}_${i}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('recibos').upload(path, blob);
          if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

          const { data: urlData } = supabase.storage.from('recibos').getPublicUrl(path);
          await supabase.from('recibos_despesas').insert({
            despesa_id: id,
            storage_path: path,
            url: urlData.publicUrl,
            tipo_ficheiro: ficheiro.tipo,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    },
  });
}

export function useDeleteDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('despesas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    },
  });
}

export function useDeleteRecibo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      const supabase = createClient();
      // Remove da storage
      await supabase.storage.from('recibos').remove([storagePath]);
      // Remove da tabela
      const { error } = await supabase.from('recibos_despesas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    },
  });
}

export function useUpdateDespesaStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DespesaStatus }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('despesas')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
      queryClient.invalidateQueries({ queryKey: ['depositos'] });
    },
  });
}

// ── Depósitos ─────────────────────────────────────────────────────────────────

export function useDepositos(tecnicoId?: string) {
  return useQuery({
    queryKey: ['depositos', tecnicoId],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('depositos')
        .select('*, tecnico:profiles!tecnico_id(*)')
        .order('data_deposito', { ascending: false });

      if (tecnicoId) query = query.eq('tecnico_id', tecnicoId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Deposito[];
    },
  });
}

export function useCreateDeposito() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      tecnico_id: string;
      admin_id: string;
      valor: number;
      descricao?: string;
      data_deposito: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from('depositos').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositos'] });
    },
  });
}

// ── Saldo ─────────────────────────────────────────────────────────────────────

export function useSaldoTecnico(tecnicoId: string) {
  const { data: depositos = [] } = useDepositos(tecnicoId);
  const { data: despesas = [] } = useDespesas({ tecnicoId });

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
