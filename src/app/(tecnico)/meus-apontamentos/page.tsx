'use client';

import { EntryCard } from '@/components/tecnico/EntryCard';
import { useAuth } from '@/hooks/useAuth';
import { useApontamentos } from '@/lib/queries/apontamentos';

export default function MeusApontamentosPage() {
  const { profile } = useAuth();
  const { data: apontamentos = [], isLoading } = useApontamentos(
    profile ? { tecnicoId: profile.id } : undefined
  );

  // Group by date
  const grouped = apontamentos.reduce<Record<string, typeof apontamentos>>(
    (acc, apt) => {
      const date = apt.data_apontamento;
      if (!acc[date]) acc[date] = [];
      acc[date].push(apt);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Meus Registos de Horas</h1>
        <p className="text-sm text-gray-muted">Histórico completo de trabalhos realizados</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-center text-gray-muted py-12">
          Nenhum registo de horas encontrado.
        </p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped)
            .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
            .map(([date, apts]) => (
              <div key={date}>
                <h2 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3 border-b border-emerald-100 pb-1">
                  {new Date(date + 'T00:00:00').toLocaleDateString('pt-PT', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {apts.map((apt) => (
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
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
