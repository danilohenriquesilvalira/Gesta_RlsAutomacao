'use client';

import { useEffect, useState } from 'react';
import { KpiCard } from '@/components/admin/KpiCard';
import { ApontamentosTable } from '@/components/admin/ApontamentosTable';
import { TecnicosTable } from '@/components/admin/TecnicosTable';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { useApontamentos, useUpdateApontamentoStatus } from '@/lib/queries/apontamentos';
import { useTecnicosComHoras } from '@/lib/queries/tecnicos';
import { useObras } from '@/lib/queries/obras';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const { data: apontamentos = [] } = useApontamentos();
  const { data: tecnicos = [] } = useTecnicosComHoras();
  const { data: obras = [] } = useObras();
  const updateStatus = useUpdateApontamentoStatus();
  const [activities, setActivities] = useState<
    Array<{ id: string; type: string; description: string; timestamp: string }>
  >([]);

  // KPI calculations
  const totalHoras = apontamentos.reduce((sum, a) => sum + (a.total_horas ?? 0), 0);
  const horasExtras = apontamentos
    .filter((a) => a.tipo_hora !== 'normal')
    .reduce((sum, a) => sum + (a.total_horas ?? 0), 0);
  const tecnicosAtivos = tecnicos.length;
  const obrasAtivas = obras.filter((o) => o.status === 'ativa').length;

  // Chart data - last 4 weeks
  const chartData = (() => {
    const weeks: { name: string; normal: number; extra: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      const weekApts = apontamentos.filter((a) => {
        const d = new Date(a.data_apontamento);
        return d >= start && d <= end;
      });
      weeks.push({
        name: `Sem ${4 - i}`,
        normal: Math.round(
          weekApts.filter((a) => a.tipo_hora === 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0)
        ),
        extra: Math.round(
          weekApts.filter((a) => a.tipo_hora !== 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0)
        ),
      });
    }
    return weeks;
  })();

  // Realtime feed
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('apontamentos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'apontamentos' },
        (payload) => {
          const newActivity = {
            id: crypto.randomUUID(),
            type: payload.eventType,
            description:
              payload.eventType === 'INSERT'
                ? 'Novo apontamento criado'
                : payload.eventType === 'UPDATE'
                ? 'Apontamento atualizado'
                : 'Apontamento removido',
            timestamp: new Date().toISOString(),
          };
          setActivities((prev) => [newActivity, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Today's appointments
  const today = new Date().toISOString().split('T')[0];
  const apontamentosHoje = apontamentos.filter(
    (a) => a.data_apontamento === today
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-navy">Dashboard</h1>
        <p className="text-gray-muted text-xs sm:text-sm">
          Visão geral do sistema
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Total de Horas"
          value={`${totalHoras.toFixed(1)}h`}
          description="Este mês"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="bg-accent-blue"
        />
        <KpiCard
          title="Horas Extras"
          value={`${horasExtras.toFixed(1)}h`}
          description="Este mês"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          color="bg-warning"
        />
        <KpiCard
          title="Técnicos Ativos"
          value={tecnicosAtivos}
          description="Cadastrados"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="bg-success"
        />
        <KpiCard
          title="Obras Ativas"
          value={obrasAtivas}
          description="Em andamento"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="bg-purple-500"
        />
      </div>

      {/* Chart + Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-border p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-navy mb-4">
            Horas por Semana
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#8896ae', fontSize: 12 }} />
              <YAxis tick={{ fill: '#8896ae', fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="normal" name="Horas Normais" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="extra" name="Horas Extras" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-border p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-navy mb-4">
            Atividades Recentes
          </h2>
          <ActivityFeed activities={activities} />
        </div>
      </div>

      {/* Técnicos */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-navy mb-4">Técnicos</h2>
        <div className="rounded-xl border border-gray-border bg-white overflow-x-auto">
          <TecnicosTable tecnicos={tecnicos} />
        </div>
      </div>

      {/* Apontamentos do dia */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-navy mb-4">
          Apontamentos de Hoje
        </h2>
        <div className="rounded-xl border border-gray-border bg-white overflow-x-auto">
          <ApontamentosTable
            apontamentos={apontamentosHoje}
            onAprovar={(id) => updateStatus.mutate({ id, status: 'aprovado' })}
            onRejeitar={(id) => updateStatus.mutate({ id, status: 'rejeitado' })}
            showActions
          />
        </div>
      </div>
    </div>
  );
}
