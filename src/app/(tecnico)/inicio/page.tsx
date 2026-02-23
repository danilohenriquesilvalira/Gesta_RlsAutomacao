'use client';

import { useState } from 'react';
import { EntryCard } from '@/components/tecnico/EntryCard';
import { ApontarModal } from '@/components/shared/ApontarModal';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  useApontamentosHoje,
  useApontamentos,
  useCreateApontamento,
} from '@/lib/queries/apontamentos';
import { useObras } from '@/lib/queries/obras';
import { saveOfflineApontamento } from '@/lib/offline/indexeddb';
import { Button } from '@/components/ui/button';
import { Clock, PlusCircle, Calendar, TrendingUp } from 'lucide-react';
import type { TipoHora } from '@/types';

export default function InicioPage() {
  const { profile } = useAuth();
  const { isOnline, refreshCount } = useOfflineSync();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: apontamentosHoje = [] } = useApontamentosHoje(profile?.id);
  const { data: obras = [] } = useObras('ativa');
  const createApontamento = useCreateApontamento();

  // Weekly hours
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const { data: apontamentosSemana = [] } = useApontamentos({
    tecnicoId: profile?.id,
    dataInicio: startOfWeek.toISOString().split('T')[0],
  });

  // Stats
  const horasSemana = apontamentosSemana.reduce((s, a) => s + (a.total_horas ?? 0), 0);
  const horasExtrasSemana = apontamentosSemana
    .filter((a) => a.tipo_hora !== 'normal')
    .reduce((s, a) => s + (a.total_horas ?? 0), 0);
  const horasHoje = apontamentosHoje.reduce((s, a) => s + (a.total_horas ?? 0), 0);

  async function handleApontar(data: {
    obra_id: string;
    tipo_servico: string;
    tipo_hora: TipoHora;
    hora_entrada: string;
    hora_saida: string;
    total_horas: number;
    descricao?: string;
    fotos_base64: string[];
  }) {
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];

    if (isOnline) {
      await createApontamento.mutateAsync({
        tecnico_id: profile.id,
        ...data,
        data_apontamento: today,
      });
    } else {
      await saveOfflineApontamento({
        local_id: crypto.randomUUID(),
        tecnico_id: profile.id,
        ...data,
        data_apontamento: today,
        created_at: new Date().toISOString(),
      });
      await refreshCount();
    }

    setModalOpen(false);
  }

  return (
    <div className="h-full flex flex-col space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">
            Olá, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-muted first-letter:uppercase">
            {new Date().toLocaleDateString('pt-PT', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      </div>

      {/* Manual Registration Big Button/Card */}
      <div
        onClick={() => setModalOpen(true)}
        className="shrink-0 cursor-pointer group bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 lg:p-10 shadow-xl shadow-emerald-200 flex flex-col items-center justify-center text-center space-y-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
          <PlusCircle className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
        </div>
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-white">Registar Horas</h2>
          <p className="text-emerald-50 text-xs lg:text-sm font-medium opacity-80 uppercase tracking-widest">Clique para iniciar registo manual</p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="shrink-0 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-border p-3 flex flex-col items-center justify-center shadow-sm">
          <Clock className="w-4 h-4 text-accent-blue mb-1" />
          <p className="text-[10px] text-gray-muted uppercase font-bold tracking-tighter">Hoje</p>
          <p className="text-base font-black text-navy">{horasHoje.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-border p-3 flex flex-col items-center justify-center shadow-sm">
          <Calendar className="w-4 h-4 text-emerald-600 mb-1" />
          <p className="text-[10px] text-gray-muted uppercase font-bold tracking-tighter">Semana</p>
          <p className="text-base font-black text-navy">{horasSemana.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-border p-3 flex flex-col items-center justify-center shadow-sm">
          <TrendingUp className="w-4 h-4 text-warning mb-1" />
          <p className="text-[10px] text-gray-muted uppercase font-bold tracking-tighter">Extras</p>
          <p className="text-base font-black text-navy">{horasExtrasSemana.toFixed(1)}h</p>
        </div>
      </div>

      {/* History section */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl border border-gray-border shadow-sm overflow-hidden mb-2">
        <div className="shrink-0 p-4 border-b border-gray-border bg-gray-50/30 flex items-center justify-between">
          <h2 className="text-sm font-black text-navy uppercase tracking-wider">Histórico de Hoje</h2>
          <span className="text-[10px] font-bold text-gray-muted bg-gray-100 px-2 py-0.5 rounded-full">{apontamentosHoje.length} registos</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {apontamentosHoje.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
              <PlusCircle className="w-10 h-10 text-gray-muted mb-2" />
              <p className="text-sm font-medium text-gray-muted">Ainda não realizou<br />nenhum registo hoje.</p>
            </div>
          ) : (
            apontamentosHoje.map((apt) => (
              <EntryCard
                key={apt.id}
                apontamento={{
                  id: apt.id,
                  obra_codigo: apt.obra?.codigo ?? '',
                  obra_nome: apt.obra?.nome ?? '',
                  tipo_servico: apt.tipo_servico,
                  hora_entrada: apt.hora_entrada,
                  hora_saida: apt.hora_saida ?? '',
                  total_horas: apt.total_horas ?? 0,
                  tipo_hora: apt.tipo_hora,
                  status: apt.status,
                  fotos_count: apt.fotos?.length ?? 0,
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Apontar Modal */}
      <ApontarModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        obras={obras}
        onSubmit={handleApontar}
        isSubmitting={createApontamento.isPending}
      />
    </div>
  );
}
