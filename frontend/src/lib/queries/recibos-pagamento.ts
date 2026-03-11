import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, API_URL } from '@/lib/api/client';
import type { ReciboPagamento } from '@/types';

export function useRecibosPagamento(tecnicoId?: string) {
  return useQuery({
    queryKey: ['recibos-pagamento', tecnicoId ?? null],
    enabled: tecnicoId !== '',
    queryFn: () => {
      const params = tecnicoId ? `?tecnico_id=${tecnicoId}` : '';
      return api.get<ReciboPagamento[]>(`/api/recibos-pagamento${params}`);
    },
  });
}

export function useCreateReciboPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      tecnico_id: string; admin_id: string; periodo: string;
      valor_bruto: number; valor_liquido?: number | null;
      descricao?: string; file: File;
    }) => {
      const formData = new FormData();
      formData.append('tecnico_id', data.tecnico_id);
      formData.append('admin_id', data.admin_id);
      formData.append('periodo', data.periodo);
      formData.append('valor_bruto', String(data.valor_bruto));
      if (data.valor_liquido != null) formData.append('valor_liquido', String(data.valor_liquido));
      if (data.descricao) formData.append('descricao', data.descricao);
      formData.append('file', data.file);

      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/recibos-pagamento`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json() as Promise<ReciboPagamento>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recibos-pagamento'] }),
  });
}

export function useDeleteReciboPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; storagePath: string }) =>
      api.delete(`/api/recibos-pagamento/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recibos-pagamento'] }),
  });
}
