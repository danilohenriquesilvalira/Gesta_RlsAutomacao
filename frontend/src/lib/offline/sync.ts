import { api } from '@/lib/api/client';
import {
  getOfflineApontamentos,
  removeOfflineApontamento,
} from './indexeddb';

export async function syncPendingEntries(): Promise<number> {
  const pending = await getOfflineApontamentos();
  if (pending.length === 0) return 0;

  let synced = 0;

  for (const apt of pending) {
    try {
      await api.post('/api/apontamentos', {
        tecnico_id: apt.tecnico_id,
        obra_id: apt.obra_id,
        tipo_servico: apt.tipo_servico,
        tipo_hora: apt.tipo_hora,
        hora_entrada: apt.hora_entrada,
        hora_saida: apt.hora_saida,
        total_horas: apt.total_horas,
        descricao: apt.descricao,
        data_apontamento: apt.data_apontamento,
        fotos_base64: apt.fotos_base64 ?? [],
      });
      await removeOfflineApontamento(apt.local_id);
      synced++;
    } catch (err) {
      console.error('Sync error for', apt.local_id, err);
    }
  }

  return synced;
}
