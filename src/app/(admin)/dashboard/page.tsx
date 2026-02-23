'use client';

import { useEffect, useState, useMemo } from 'react';
import { KpiCard } from '@/components/admin/KpiCard';
import { ApontamentosTable } from '@/components/admin/ApontamentosTable';
import { TecnicosTable } from '@/components/admin/TecnicosTable';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { useApontamentos, useUpdateApontamentoStatus } from '@/lib/queries/apontamentos';
import { useTecnicosComHoras } from '@/lib/queries/tecnicos';
import { useObras } from '@/lib/queries/obras';
import { createClient } from '@/lib/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, Clock, TrendingUp, Users, Building2, Activity, ListChecks } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const { data: apontamentos = [] } = useApontamentos();
  const { data: tecnicos = [] } = useTecnicosComHoras();
  const { data: obras = [] } = useObras();
  const updateStatus = useUpdateApontamentoStatus();
  const [activities, setActivities] = useState<
    Array<{ id: string; type: string; description: string; timestamp: string }>
  >([]);

  // Search states
  const [searchTecnico, setSearchTecnico] = useState('');
  const [searchApontamento, setSearchApontamento] = useState('');

  // KPI calculations
  const totalHoras = apontamentos.reduce((sum, a) => sum + (a.total_horas ?? 0), 0);
  const horasExtras = apontamentos
    .filter((a) => a.tipo_hora !== 'normal')
    .reduce((sum, a) => sum + (a.total_horas ?? 0), 0);
  const tecnicosAtivos = tecnicos.length;
  const obrasAtivas = obras.filter((o) => o.status === 'ativa').length;

  // Chart data
  const chartData = useMemo(() => {
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
  }, [apontamentos]);

  // Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apontamentos' }, () => { })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Filtered data
  const today = new Date().toISOString().split('T')[0];
  const filteredTecnicos = useMemo(() => {
    return tecnicos.filter(t =>
      t.full_name.toLowerCase().includes(searchTecnico.toLowerCase()) ||
      (t.obraAtual && t.obraAtual.toLowerCase().includes(searchTecnico.toLowerCase()))
    );
  }, [tecnicos, searchTecnico]);

  const filteredApontamentosHoje = useMemo(() => {
    return apontamentos
      .filter(a => a.data_apontamento === today)
      .filter(a =>
        a.tecnico?.full_name.toLowerCase().includes(searchApontamento.toLowerCase()) ||
        a.obra?.nome.toLowerCase().includes(searchApontamento.toLowerCase()) ||
        a.tipo_servico.toLowerCase().includes(searchApontamento.toLowerCase())
      );
  }, [apontamentos, searchApontamento, today]);

  return (
    <div className="h-full flex flex-col space-y-3 lg:space-y-4 animate-in fade-in duration-500">
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-navy rounded-lg lg:hidden">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy tracking-tight">Painel Administrativo</h1>
            <p className="text-gray-muted text-[11px] sm:text-xs">Operação em tempo real</p>
          </div>
        </div>
      </div>

      {/* KPIs with Lucide Icons */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Total Horas"
          value={`${totalHoras.toFixed(1)}h`}
          icon={<Clock className="w-4 h-4" />}
          color="bg-accent-blue/10 text-accent-blue"
        />
        <KpiCard
          title="Extras"
          value={`${horasExtras.toFixed(1)}h`}
          icon={<TrendingUp className="w-4 h-4" />}
          color="bg-warning/10 text-orange-600"
        />
        <KpiCard
          title="Técnicos"
          value={tecnicosAtivos}
          icon={<Users className="w-4 h-4" />}
          color="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          title="Obras"
          value={obrasAtivas}
          icon={<Building2 className="w-4 h-4" />}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Graphs */}
      <div className="shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-3 h-[220px]">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-border p-3 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-navy/70" />
              <h2 className="text-[13px] font-bold text-navy">Produtividade Semanal</h2>
            </div>
            <div className="flex gap-3 text-[10px] font-semibold text-gray-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-600" /> Normal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500" /> Extra</span>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }} />
                <Bar dataKey="normal" fill="#2563eb" radius={[3, 3, 0, 0]} barSize={18} />
                <Bar dataKey="extra" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-border p-3 flex flex-col shadow-sm hidden lg:flex">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Activity className="w-4 h-4 text-navy/70" />
            <h2 className="text-[13px] font-bold text-navy">Monitor Fluxo</h2>
          </div>
          <ScrollArea className="flex-1">
            <ActivityFeed activities={activities} />
          </ScrollArea>
        </div>
      </div>

      {/* Tables Section */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0 pb-2">
        {/* Tecnicos Section */}
        <div className="flex flex-col min-h-0 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
          <div className="shrink-0 flex items-center justify-between p-3 border-b border-gray-border bg-gray-50/30">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-navy/70" />
              <h2 className="text-[13px] font-bold text-navy">Desempenho da Equipa</h2>
            </div>
            <div className="relative w-40 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-muted" />
              <Input
                placeholder="Procurar técnico..."
                className="h-7 pl-8 text-[11px] bg-white border-gray-border rounded-full w-full focus:ring-1 focus:ring-accent-blue"
                value={searchTecnico}
                onChange={(e) => setSearchTecnico(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <TecnicosTable tecnicos={filteredTecnicos} />
          </ScrollArea>
        </div>

        {/* Apontamentos Section */}
        <div className="flex flex-col min-h-0 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
          <div className="shrink-0 flex items-center justify-between p-3 border-b border-gray-border bg-gray-50/30">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-navy/70" />
              <h2 className="text-[13px] font-bold text-navy">Apontamentos de Hoje</h2>
            </div>
            <div className="relative w-40 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-muted" />
              <Input
                placeholder="Procurar obra ou serviço..."
                className="h-7 pl-8 text-[11px] bg-white border-gray-border rounded-full w-full focus:ring-1 focus:ring-accent-blue"
                value={searchApontamento}
                onChange={(e) => setSearchApontamento(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <ApontamentosTable
              apontamentos={filteredApontamentosHoje}
              onAprovar={(id) => updateStatus.mutate({ id, status: 'aprovado' })}
              onRejeitar={(id) => updateStatus.mutate({ id, status: 'rejeitado' })}
              showActions
            />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
