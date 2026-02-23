'use client';

import { useState } from 'react';
import { HeroTimer } from '@/components/tecnico/HeroTimer';
import { EntryCard } from '@/components/tecnico/EntryCard';
import { ApontarModal } from '@/components/shared/ApontarModal';
import { useAuth } from '@/hooks/useAuth';
import { useTimer } from '@/hooks/useTimer';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  useApontamentosHoje,
  useApontamentos,
  useCreateApontamento,
} from '@/lib/queries/apontamentos';
import { useObras } from '@/lib/queries/obras';
import { saveOfflineApontamento } from '@/lib/offline/indexeddb';
import { calcTotalHoras } from '@/lib/utils/calcHoras';
import type { TipoHora } from '@/types';

export default function InicioPage() {
  const { profile } = useAuth();
  const timer = useTimer();
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
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const horasMes = apontamentosSemana.reduce((s, a) => s + (a.total_horas ?? 0), 0);
  const horasExtrasMes = apontamentosSemana
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-navy">
          Olá, {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-muted">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Timer */}
      <HeroTimer
        isRunning={timer.isRunning}
        elapsed={timer.formatted}
        onStop={() => {
          timer.stop();
          setModalOpen(true);
        }}
        onStart={timer.start}
      />

      {/* Stats + Quick Action row on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white rounded-xl border border-gray-border p-3 lg:p-4 text-center">
          <p className="text-xs text-gray-muted">Hoje</p>
          <p className="text-lg lg:text-xl font-bold text-navy">{horasHoje.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-border p-3 lg:p-4 text-center">
          <p className="text-xs text-gray-muted">Semana</p>
          <p className="text-lg lg:text-xl font-bold text-accent-blue">
            {horasMes.toFixed(1)}h
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-border p-3 lg:p-4 text-center">
          <p className="text-xs text-gray-muted">Extras</p>
          <p className="text-lg lg:text-xl font-bold text-warning">
            {horasExtrasMes.toFixed(1)}h
          </p>
        </div>
        {/* Quick Action inline on desktop */}
        <button
          onClick={() => setModalOpen(true)}
          className="bg-navy hover:bg-navy-light text-white rounded-xl py-3 lg:py-0 font-semibold transition-colors"
        >
          + Apontar Horas
        </button>
      </div>

      {/* Today's entries + Week table side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-text mb-3">
            Serviços de Hoje
          </h2>
          {apontamentosHoje.length === 0 ? (
            <p className="text-sm text-gray-muted text-center py-8">
              Nenhum apontamento hoje
            </p>
          ) : (
            <div className="space-y-3">
              {apontamentosHoje.map((apt) => (
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
              ))}
            </div>
          )}
        </div>

        {/* Week table */}
        {apontamentosSemana.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-text mb-3">
              Esta Semana
            </h2>
            <div className="bg-white rounded-xl border border-gray-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-border bg-gray-bg">
                    <th className="text-left px-3 py-2 text-gray-muted font-medium">
                      Data
                    </th>
                    <th className="text-left px-3 py-2 text-gray-muted font-medium">
                      Obra
                    </th>
                    <th className="text-right px-3 py-2 text-gray-muted font-medium">
                      Horas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apontamentosSemana.map((apt) => (
                    <tr key={apt.id} className="border-b border-gray-border last:border-0">
                      <td className="px-3 py-2 text-gray-text">
                        {new Date(apt.data_apontamento + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2 text-navy font-medium">
                        {apt.obra?.codigo}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-navy">
                        {(apt.total_horas ?? 0).toFixed(1)}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
