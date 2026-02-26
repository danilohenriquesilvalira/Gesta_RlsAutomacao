'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useApontamentos, useUpdateApontamentoStatus } from '@/lib/queries/apontamentos';
import { useTecnicosComHoras } from '@/lib/queries/tecnicos';
import { useObras } from '@/lib/queries/obras';
import { useDespesas, useDepositos } from '@/lib/queries/despesas';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Clock, Users, Building2, Wallet, AlertCircle, CheckCircle2, XCircle,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────

function eur(n: number) {
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtH(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}
function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-border/60 ${className}`} />;
}

const TIPO_COLORS: Record<string, string> = {
  Alojamento: '#8b5cf6', Alimentação: '#f97316', Transporte: '#0ea5e9',
  Combustível: '#eab308', Material: '#14b8a6', Outro: '#94a3b8',
};

// ── Tooltips ───────────────────────────────────────────────────────────────────

function TooltipHoras({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-border rounded-xl shadow-xl p-3 text-[11px]">
      <p className="font-black text-navy mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="font-medium text-gray-muted">{p.name}</span>
          </div>
          <span className="font-black text-navy">{fmtH(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function TooltipEur({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-border rounded-xl shadow-xl p-3 text-[11px]">
      <p className="font-black text-navy mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="font-medium text-gray-muted">{p.name}</span>
          </div>
          <span className="font-black text-navy">{eur(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data: apontamentos = [], isLoading: lApt } = useApontamentos();
  const { data: tecnicos = [], isLoading: lTec } = useTecnicosComHoras();
  const { data: obras = [], isLoading: lObras } = useObras();
  const { data: despesas = [], isLoading: lDesp } = useDespesas();
  const { data: depositos = [], isLoading: lDep } = useDepositos();
  const updateStatus = useUpdateApontamentoStatus();

  const isLoading = lApt || lTec || lDesp || lDep || lObras;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const horasAprovadas = apontamentos
      .filter((a) => a.status === 'aprovado')
      .reduce((s, a) => s + (a.total_horas ?? 0), 0);
    const obrasAtivas = obras.filter((o) => o.status === 'ativa').length;
    const custoAprovado = despesas
      .filter((d) => d.status === 'aprovada')
      .reduce((s, d) => s + Number(d.valor), 0);
    const totalDepositado = depositos.reduce((s, d) => s + Number(d.valor), 0);
    const saldoGlobal = totalDepositado - custoAprovado;
    const pendentesApt = apontamentos.filter((a) => a.status === 'pendente').length;
    const pendentesDsp = despesas.filter((d) => d.status === 'pendente').length;
    return { horasAprovadas, obrasAtivas, custoAprovado, totalDepositado, saldoGlobal, pendentesApt, pendentesDsp };
  }, [apontamentos, obras, despesas, depositos]);

  // ── Horas semanais (6 semanas) ────────────────────────────────────────────
  const weeklyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      const label = `${start.getDate()}/${start.getMonth() + 1}`;
      const week = apontamentos.filter((a) => {
        const d = new Date(a.data_apontamento + 'T00:00:00');
        return d >= start && d <= end && a.status === 'aprovado';
      });
      return {
        name: label,
        Normal: Math.round(week.filter((a) => a.tipo_hora === 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0)),
        Extra: Math.round(week.filter((a) => a.tipo_hora !== 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0)),
      };
    }).reverse();
  }, [apontamentos]);

  // ── Custos por categoria ──────────────────────────────────────────────────
  const custosPorTipo = useMemo(() => {
    const tipos = ['alojamento', 'alimentação', 'transporte', 'combustível', 'material', 'outro'];
    const total = despesas.filter((d) => d.status === 'aprovada').reduce((s, d) => s + Number(d.valor), 0);
    return tipos
      .map((tipo) => {
        const label = tipo.charAt(0).toUpperCase() + tipo.slice(1);
        const value = despesas
          .filter((d) => d.tipo_despesa === tipo && d.status === 'aprovada')
          .reduce((s, d) => s + Number(d.valor), 0);
        return { name: label, value, color: TIPO_COLORS[label] ?? '#94a3b8', pct: total > 0 ? Math.round((value / total) * 100) : 0 };
      })
      .filter((t) => t.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [despesas]);

  // ── Performance por técnico (cruzamento: apontamentos + despesas + depósitos) ──
  const performanceTecnicos = useMemo(() => {
    return tecnicos
      .map((t) => {
        const apts = apontamentos.filter((a) => a.tecnico_id === t.id && a.status === 'aprovado');
        const horasNormal = apts.filter((a) => a.tipo_hora === 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0);
        const horasExtra = apts.filter((a) => a.tipo_hora !== 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0);
        const totalHoras = horasNormal + horasExtra;
        const custoDespesas = despesas
          .filter((d) => d.tecnico_id === t.id && d.status === 'aprovada')
          .reduce((s, d) => s + Number(d.valor), 0);
        const totalDep = depositos.filter((d) => d.tecnico_id === t.id).reduce((s, d) => s + Number(d.valor), 0);
        const saldo = totalDep - custoDespesas;
        const ratioExtra = totalHoras > 0 ? (horasExtra / totalHoras) * 100 : 0;
        return { ...t, totalHoras, horasNormal, horasExtra, ratioExtra, custoDespesas, totalDep, saldo };
      })
      .sort((a, b) => b.totalHoras - a.totalHoras);
  }, [tecnicos, apontamentos, despesas, depositos]);

  // ── Fluxo de caixa por técnico (bar chart) ────────────────────────────────
  const fluxoCaixaData = useMemo(() =>
    performanceTecnicos
      .filter((t) => t.totalDep > 0 || t.custoDespesas > 0)
      .slice(0, 7)
      .map((t) => ({
        name: t.full_name.split(' ')[0],
        Depositado: parseFloat(t.totalDep.toFixed(2)),
        Gasto: parseFloat(t.custoDespesas.toFixed(2)),
      })),
    [performanceTecnicos]
  );

  // ── Obras: custo vs progresso (cruzamento chave) ──────────────────────────
  const obrasInsight = useMemo(() =>
    obras
      .filter((o) => o.status === 'ativa')
      .map((o) => {
        const custo = despesas
          .filter((d) => d.obra_id === o.id && d.status === 'aprovada')
          .reduce((s, d) => s + Number(d.valor), 0);
        const horas = apontamentos
          .filter((a) => a.obra_id === o.id && a.status === 'aprovado')
          .reduce((s, a) => s + (a.total_horas ?? 0), 0);
        const prog = o.progresso ?? 0;
        const risco = custo > 0 && prog < 40 ? 'alto' : custo > 0 && prog < 70 ? 'medio' : 'ok';
        return { id: o.id, nome: o.nome, codigo: o.codigo, cliente: o.cliente, prog, custo, horas, risco };
      })
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 6),
    [obras, despesas, apontamentos]
  );

  // ── Pendentes de aprovação ────────────────────────────────────────────────
  const pendentes = useMemo(() =>
    apontamentos
      .filter((a) => a.status === 'pendente')
      .sort((a, b) => b.data_apontamento.localeCompare(a.data_apontamento))
      .slice(0, 8),
    [apontamentos]
  );

  const today = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col gap-3 lg:overflow-hidden">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Administração</p>
          <h1 className="text-xl font-black text-navy tracking-tight">Painel de Controlo</h1>
        </div>
        <p className="text-[11px] text-gray-muted font-medium capitalize hidden sm:block">{today}</p>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { label: 'Horas Aprovadas', value: isLoading ? '—' : fmtH(kpis.horasAprovadas), icon: <Clock size={13} />, accent: 'bg-accent-blue', iconBg: 'bg-blue-50 text-accent-blue' },
          { label: 'Técnicos', value: isLoading ? '—' : tecnicos.length, icon: <Users size={13} />, accent: 'bg-success', iconBg: 'bg-emerald-50 text-success' },
          { label: 'Obras Ativas', value: isLoading ? '—' : kpis.obrasAtivas, icon: <Building2 size={13} />, accent: 'bg-purple-500', iconBg: 'bg-purple-50 text-purple-500' },
          { label: 'Custo Aprovado', value: isLoading ? '—' : eur(kpis.custoAprovado), icon: <Wallet size={13} />, accent: 'bg-error', iconBg: 'bg-red-50 text-error', small: true },
          { label: 'Apt. Pendentes', value: isLoading ? '—' : kpis.pendentesApt, icon: <AlertCircle size={13} />, accent: 'bg-warning', iconBg: 'bg-amber-50 text-warning' },
          { label: 'Desp. Pendentes', value: isLoading ? '—' : kpis.pendentesDsp, icon: <AlertCircle size={13} />, accent: 'bg-warning', iconBg: 'bg-amber-50 text-warning' },
        ].map((k, i) => (
          <div key={i} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${k.accent}`} />
            <div className="pl-4 pr-3 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted leading-tight">{k.label}</p>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${k.iconBg}`}>{k.icon}</div>
              </div>
              <p className={`font-black text-navy leading-none ${(k as any).small ? 'text-[14px]' : 'text-[20px]'}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main flex-1 ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-3">

        {/* Col 1-3: charts */}
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0">

          {/* Horas Semanais */}
          <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-gray-border/60 shrink-0 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Evolução Semanal</p>
                <h3 className="text-[13px] font-bold text-navy">Horas Aprovadas</h3>
              </div>
              <div className="flex gap-3 text-[10px] font-semibold text-gray-muted">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-accent-blue inline-block" />Normal</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-warning inline-block" />Extra</span>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-3">
              {isLoading ? <Sk className="w-full h-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8896ae', fontSize: 10, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8896ae', fontSize: 10, fontWeight: 600 }} />
                    <Tooltip content={<TooltipHoras />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="Normal" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="Extra" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Fluxo de Caixa por Técnico */}
          <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-gray-border/60 shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Fundo de Maneio</p>
              <h3 className="text-[13px] font-bold text-navy">Fluxo de Caixa por Técnico</h3>
            </div>
            <div className="flex-1 min-h-0 p-3">
              {isLoading ? <Sk className="w-full h-full" /> : fluxoCaixaData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-gray-muted">Sem dados de fluxo ainda</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fluxoCaixaData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8896ae', fontSize: 10, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8896ae', fontSize: 10, fontWeight: 600 }} />
                    <Tooltip content={<TooltipEur />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="Depositado" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="Gasto" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Col 4-5 */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">

          {/* Custo por Categoria */}
          <div className="bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden shrink-0">
            <div className="px-4 py-2.5 border-b border-gray-border/60">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Custos Aprovados</p>
              <h3 className="text-[13px] font-bold text-navy">Por Categoria</h3>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-6 w-full" />)
              ) : custosPorTipo.length === 0 ? (
                <p className="text-xs text-gray-muted text-center py-2">Sem despesas aprovadas</p>
              ) : (
                custosPorTipo.map((t) => (
                  <div key={t.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="text-[11px] font-semibold text-navy">{t.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-navy">{eur(t.value)}</span>
                        <span className="text-[9px] text-gray-muted w-6 text-right">{t.pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Obras: Custo vs Progresso */}
          <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-gray-border/60 shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Saúde Financeira</p>
              <h3 className="text-[13px] font-bold text-navy">Obras — Custo vs Progresso</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-10 w-full" />)
              ) : obrasInsight.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-gray-muted">Sem obras com dados</p>
                </div>
              ) : (
                obrasInsight.map((o) => {
                  const progColor = o.prog >= 80 ? '#10b981' : o.prog >= 50 ? '#2563eb' : '#f59e0b';
                  const riscoColor = o.risco === 'alto' ? 'text-error' : o.risco === 'medio' ? 'text-warning' : 'text-success';
                  return (
                    <div key={o.id}>
                      <div className="flex items-start justify-between mb-1.5 gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-navy truncate leading-tight">{o.nome}</p>
                          <p className="text-[9px] text-gray-muted">{o.cliente} · {fmtH(o.horas)} · {eur(o.custo)}</p>
                        </div>
                        <span className={`text-[10px] font-black shrink-0 ${riscoColor}`}>{o.prog}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${o.prog}%`, backgroundColor: progColor }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row ────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-1 lg:grid-cols-5 gap-3">

        {/* Performance da Equipa */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-border/60">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Ranking</p>
            <h3 className="text-[13px] font-bold text-navy">Performance da Equipa</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-border/50 bg-gray-bg/40">
                  <th className="text-left px-4 py-2 font-black text-[9px] uppercase tracking-widest text-gray-muted">Técnico</th>
                  <th className="text-right px-3 py-2 font-black text-[9px] uppercase tracking-widest text-gray-muted">Horas</th>
                  <th className="text-right px-3 py-2 font-black text-[9px] uppercase tracking-widest text-gray-muted hidden sm:table-cell">Extra</th>
                  <th className="text-right px-3 py-2 font-black text-[9px] uppercase tracking-widest text-gray-muted">Despesas</th>
                  <th className="text-right px-4 py-2 font-black text-[9px] uppercase tracking-widest text-gray-muted">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-border/30">
                      <td className="px-4 py-3"><Sk className="h-4 w-28" /></td>
                      <td className="px-3 py-3"><Sk className="h-4 w-12 ml-auto" /></td>
                      <td className="px-3 py-3 hidden sm:table-cell"><Sk className="h-4 w-10 ml-auto" /></td>
                      <td className="px-3 py-3"><Sk className="h-4 w-16 ml-auto" /></td>
                      <td className="px-4 py-3"><Sk className="h-4 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : performanceTecnicos.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-muted">Sem dados</td></tr>
                ) : (
                  performanceTecnicos.slice(0, 5).map((t, i) => (
                    <tr key={t.id} className="border-b border-gray-border/30 last:border-0 hover:bg-gray-bg/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-gray-muted w-3 shrink-0">{i + 1}</span>
                          <div className="w-6 h-6 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden">
                            {t.avatar_url
                              ? <img src={t.avatar_url} alt={t.full_name} className="w-full h-full object-cover" />
                              : <span className="text-[8px] font-black text-white">{getInitials(t.full_name)}</span>
                            }
                          </div>
                          <span className="font-semibold text-navy truncate">{t.full_name.split(' ')[0]}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-navy">{fmtH(t.totalHoras)}</td>
                      <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                        <span className={cn('font-bold text-[11px]', t.ratioExtra > 30 ? 'text-warning' : 'text-gray-muted')}>
                          {t.ratioExtra.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-error">{eur(t.custoDespesas)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={cn('font-black', t.saldo >= 0 ? 'text-success' : 'text-error')}>
                          {t.saldo >= 0 ? '+' : ''}{eur(t.saldo)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aprovações Pendentes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-border/60 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Ação Necessária</p>
              <h3 className="text-[13px] font-bold text-navy">Aprovações Pendentes</h3>
            </div>
            {kpis.pendentesApt > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-warning/15 text-warning text-[10px] font-black flex items-center justify-center">
                {kpis.pendentesApt}
              </span>
            )}
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-2.5 border-b border-gray-border/40 flex items-center justify-between">
                  <div className="space-y-1.5"><Sk className="h-3 w-28" /><Sk className="h-2.5 w-20" /></div>
                  <div className="flex gap-1.5"><Sk className="h-7 w-7 rounded-lg" /><Sk className="h-7 w-7 rounded-lg" /></div>
                </div>
              ))
            ) : pendentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-5 text-center">
                <CheckCircle2 size={18} className="text-success mb-2" />
                <p className="text-xs font-semibold text-navy">Tudo em dia!</p>
                <p className="text-[10px] text-gray-muted">Sem aprovações pendentes.</p>
              </div>
            ) : (
              pendentes.map((a) => (
                <div key={a.id} className="px-4 py-2.5 border-b border-gray-border/40 last:border-0 flex items-center justify-between gap-3 hover:bg-gray-bg/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-navy truncate">
                      {a.tecnico?.full_name?.split(' ')[0] ?? '—'} · {a.obra?.nome ?? 'Oficina'}
                    </p>
                    <p className="text-[10px] text-gray-muted">
                      {a.tipo_servico} · {fmtH(a.total_horas ?? 0)} · {new Date(a.data_apontamento + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => updateStatus.mutate({ id: a.id, status: 'aprovado' })}
                      className="w-7 h-7 rounded-lg bg-success/10 text-success hover:bg-success hover:text-white transition-all flex items-center justify-center"
                      title="Aprovar"
                    >
                      <CheckCircle2 size={13} />
                    </button>
                    <button
                      onClick={() => updateStatus.mutate({ id: a.id, status: 'rejeitado' })}
                      className="w-7 h-7 rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all flex items-center justify-center"
                      title="Rejeitar"
                    >
                      <XCircle size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
