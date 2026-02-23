import { createClient } from '@/lib/supabase/client';
import {
  getOfflineApontamentos,
  removeOfflineApontamento,
} from './indexeddb';

export async function syncPendingEntries(): Promise<number> {
  const supabase = createClient();
  const pending = await getOfflineApontamentos();

  if (pending.length === 0) return 0;

  let synced = 0;

  for (const apt of pending) {
    try {
      // Insert apontamento
      const { data: inserted, error } = await supabase
        .from('apontamentos')
        .insert({
          tecnico_id: apt.tecnico_id,
          obra_id: apt.obra_id,
          tipo_servico: apt.tipo_servico,
          tipo_hora: apt.tipo_hora,
          hora_entrada: apt.hora_entrada,
          hora_saida: apt.hora_saida,
          total_horas: apt.total_horas,
          descricao: apt.descricao,
          data_apontamento: apt.data_apontamento,
          synced_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Upload photos if any
      if (apt.fotos_base64?.length > 0 && inserted) {
        for (let i = 0; i < apt.fotos_base64.length; i++) {
          const base64 = apt.fotos_base64[i];
          const byteString = atob(base64.split(',')[1] || base64);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let j = 0; j < byteString.length; j++) {
            ia[j] = byteString.charCodeAt(j);
          }
          const blob = new Blob([ab], { type: 'image/jpeg' });

          const path = `fotos/${apt.tecnico_id}/${apt.data_apontamento}/${inserted.id}_${i}.jpg`;
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

      await removeOfflineApontamento(apt.local_id);
      synced++;
    } catch (err) {
      console.error('Sync error for', apt.local_id, err);
    }
  }

  return synced;
}
