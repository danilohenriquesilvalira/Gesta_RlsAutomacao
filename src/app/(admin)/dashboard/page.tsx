'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useApontamentos, useUpdateApontamentoStatus } from '@/lib/queries/apontamentos';
import { useTecnicosComHoras } from '@/lib/queries/tecnicos';
import { useObras } from '@/lib/queries/obras';
import { useDespesas, useDepositos, useUpdateDespesaStatus } from '@/lib/queries/despesas';
import {
  AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Clock, Users, Building2, Wallet, AlertCircle, CheckCircle2, XCircle, Receipt, Timer, MapPin,
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

const MONTHLY_TARGET = 176; // 8h × 22 dias úteis

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

function TooltipCategoria({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-border rounded-xl shadow-xl p-2.5 text-[11px]">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.payload.color }} />
        <span className="font-black text-navy">{d.payload.name}</span>
      </div>
      <p className="text-gray-muted">{eur(d.value)} · <span className="font-bold text-navy">{d.payload.pct}%</span></p>
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
  const updateAptStatus  = useUpdateApontamentoStatus();
  const updateDespStatus = useUpdateDespesaStatus();

  const isLoading = lApt || lTec || lDesp || lDep || lObras;

  // ── Ciclo atual ─────────────────────────────────────────────────────────────
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nomeMes = now.toLocaleDateString('pt-PT', { month: 'long' });
  const cicloLabel = `Ciclo: ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${now.getFullYear()}`;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const horasAprovadas = apontamentos
      .filter((a) => a.status === 'aprovado' && a.data_apontamento.startsWith(currentMonthStr))
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
  }, [apontamentos, obras, despesas, depositos, currentMonthStr]);

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

  // ── Performance por técnico ────────────────────────────────────────────────
  const performanceTecnicos = useMemo(() => {
    return tecnicos
      .map((t) => {
        const aptsAll = apontamentos.filter((a) => a.tecnico_id === t.id && a.status === 'aprovado');
        const aptsMes = aptsAll.filter((a) => a.data_apontamento.startsWith(currentMonthStr));
        const horasNormal = aptsAll.filter((a) => a.tipo_hora === 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0);
        const horasExtra = aptsAll.filter((a) => a.tipo_hora !== 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0);
        const totalHoras = horasNormal + horasExtra;
        const horasMes = aptsMes.reduce((s, a) => s + (a.total_horas ?? 0), 0);
        const horasExtraMes = aptsMes.filter((a) => a.tipo_hora !== 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0);
        const custoDespesas = despesas
          .filter((d) => d.tecnico_id === t.id && d.status === 'aprovada')
          .reduce((s, d) => s + Number(d.valor), 0);
        const totalDep = depositos.filter((d) => d.tecnico_id === t.id).reduce((s, d) => s + Number(d.valor), 0);
        const saldo = totalDep - custoDespesas;
        const ratioExtra = totalHoras > 0 ? (horasExtra / totalHoras) * 100 : 0;
        const isSaldoCritico = saldo < 50;
        return { ...t, totalHoras, horasNormal, horasExtra, ratioExtra, custoDespesas, totalDep, saldo, isSaldoCritico, horasMes, horasExtraMes };
      })
      .sort((a, b) => b.totalHoras - a.totalHoras);
  }, [tecnicos, apontamentos, despesas, depositos, currentMonthStr]);

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

  // ── Obras: custo vs progresso + orçamento ────────────────────────────────
  const obrasInsight = useMemo(() =>
    obras
      .filter((o) => o.status === 'ativa' && !!o.created_by)
      .map((o) => {
        const custo = despesas
          .filter((d) => d.obra_id === o.id && d.status === 'aprovada')
          .reduce((s, d) => s + Number(d.valor), 0);
        const horas = apontamentos
          .filter((a) => a.obra_id === o.id && a.status === 'aprovado')
          .reduce((s, a) => s + (a.total_horas ?? 0), 0);
        const prog = o.progresso ?? 0;
        const risco = custo > 0 && prog < 40 ? 'alto' : custo > 0 && prog < 70 ? 'medio' : 'ok';
        const orcamento = o.orcamento ?? null;
        const budgetPct = orcamento && orcamento > 0 ? Math.min((custo / orcamento) * 100, 100) : null;
        const budgetColor = budgetPct === null ? null : budgetPct > 90 ? '#ef4444' : budgetPct > 70 ? '#f59e0b' : '#10b981';
        return { id: o.id, nome: o.nome, codigo: o.codigo, cliente: o.cliente, prog, custo, horas, risco, localizacao: o.localizacao, executante: o.executante, orcamento, budgetPct, budgetColor };
      })
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 6),
    [obras, despesas, apontamentos]
  );

  // ── Pendentes de aprovação (apontamentos + despesas combinados) ───────────
  const pendentesCombo = useMemo(() => {
    const apts = apontamentos
      .filter((a) => a.status === 'pendente')
      .map((a) => ({
        id: a.id,
        tipo: 'apontamento' as const,
        tecnicoNome: a.tecnico?.full_name ?? '—',
        obraNome: a.obra?.nome ?? 'Oficina',
        subtitulo: `${a.tipo_servico} · ${fmtH(a.total_horas ?? 0)}`,
        data: a.data_apontamento,
      }));
    const desps = despesas
      .filter((d) => d.status === 'pendente')
      .map((d) => ({
        id: d.id,
        tipo: 'despesa' as const,
        tecnicoNome: d.tecnico?.full_name ?? '—',
        obraNome: d.obra?.nome ?? '—',
        subtitulo: `${d.tipo_despesa.charAt(0).toUpperCase() + d.tipo_despesa.slice(1)} · ${eur(Number(d.valor))}`,
        data: d.data_despesa,
      }));
    return [...apts, ...desps]
      .map(item => ({ ...item, isOld: !item.data.startsWith(currentMonthStr) }))
      .sort((a, b) => {
        if (a.isOld !== b.isOld) return a.isOld ? -1 : 1;
        return b.data.localeCompare(a.data);
      });
  }, [apontamentos, despesas, currentMonthStr]);

  // ── Alertas críticos ───────────────────────────────────────────────────────
  const tecnicosCriticos = performanceTecnicos.filter(t => t.isSaldoCritico).length;
  const obrasAcimaBudget = obrasInsight.filter(o => o.budgetPct !== null && o.budgetPct > 90).length;
  const pendentesAntigos = pendentesCombo.filter(p => p.isOld).length;
  const hasCriticalAlerts = tecnicosCriticos > 0 || obrasAcimaBudget > 0 || pendentesAntigos > 0;

  const today = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col gap-3 lg:overflow-hidden">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Administração</p>
          <h1 className="text-[18px] font-black text-navy tracking-tight">Painel de Controlo</h1>
        </div>
        <p className="text-[11px] text-gray-muted font-medium capitalize hidden sm:block">{today}</p>
      </div>

      {/* ── Banner de Alerta Crítico ───────────────────────────────────────── */}
      {hasCriticalAlerts && (
        <div className="shrink-0 flex items-center gap-3 bg-error/8 border border-error/25 rounded-xl px-4 py-2.5">
          <AlertCircle size={14} className="text-error shrink-0" />
          <p className="text-[11px] font-semibold text-error flex-1">
            Atenção: {[
              tecnicosCriticos > 0 && `${tecnicosCriticos} técnico(s) em saldo crítico`,
              obrasAcimaBudget > 0 && `${obrasAcimaBudget} obra(s) acima do orçamento`,
              pendentesAntigos > 0 && `${pendentesAntigos} aprovação(ões) em atraso`,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
      )}

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { label: 'Horas Aprovadas', value: isLoading ? '—' : fmtH(kpis.horasAprovadas), icon: <Clock size={13} />, accent: 'bg-accent-blue', iconBg: 'bg-blue-50 text-accent-blue', sub: cicloLabel },
          { label: 'Funcionários', value: isLoading ? '—' : tecnicos.length, icon: <Users size={13} />, accent: 'bg-success', iconBg: 'bg-emerald-50 text-success' },
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
              <p className={`font-black text-navy leading-none ${(k as any).small ? 'text-[13px]' : 'text-[18px]'}`}>{k.value}</p>
              {(k as any).sub && <p className="text-[8px] text-gray-muted mt-0.5">{(k as any).sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main flex-1 ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">

        {/* ── Linha 1: Gráficos — altura fixa ──────────────────────────────── */}
        <div className="shrink-0 grid grid-cols-1 lg:grid-cols-5 gap-3">

          {/* Horas Semanais (AreaChart) — col-span-3 */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden flex flex-col" style={{ height: 360 }}>
            <div className="px-4 py-2.5 border-b border-gray-border/60 shrink-0 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Evolução Semanal</p>
                <h3 className="text-[13px] font-bold text-navy">Horas Aprovadas</h3>
              </div>
              <div className="flex gap-3 text-[10px] font-semibold text-gray-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent-blue inline-block" />Normal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warning inline-block" />Extra
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-3">
              {isLoading ? <Sk className="w-full h-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillNormal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="fillExtra" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8896ae', fontSize: 10, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8896ae', fontSize: 10, fontWeight: 600 }} />
                    <Tooltip content={<TooltipHoras />} cursor={{ stroke: '#e4e8f0', strokeWidth: 1 }} />
                    <Area dataKey="Normal" type="monotone" stroke="#2563eb" strokeWidth={2} fill="url(#fillNormal)" dot={false} activeDot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} />
                    <Area dataKey="Extra" type="monotone" stroke="#f59e0b" strokeWidth={2} fill="url(#fillExtra)" dot={false} activeDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Análise de Custos + Obras — card combinado, col-span-2 */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden flex flex-col" style={{ height: 360 }}>
            <div className="px-4 py-2 border-b border-gray-border/60 shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Custos & Projetos</p>
              <h3 className="text-[12px] font-bold text-navy">Análise de Custos</h3>
            </div>

            {/* ── Secção superior: Donut ── */}
            <div className="shrink-0 px-4 py-2.5 flex items-center gap-3" style={{ height: 148 }}>
              {isLoading ? (
                <div className="flex gap-3 items-center w-full">
                  <Sk className="h-24 w-24 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-3 w-full" />)}
                  </div>
                </div>
              ) : custosPorTipo.length === 0 ? (
                <div className="w-full flex items-center justify-center">
                  <p className="text-[11px] text-gray-muted">Sem despesas aprovadas</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <div className="shrink-0" style={{ width: 100, height: 100 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={custosPorTipo} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={2} dataKey="value" strokeWidth={0}>
                          {custosPorTipo.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<TooltipCategoria />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    {custosPorTipo.slice(0, 5).map((t) => (
                      <div key={t.name} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="text-[10px] font-semibold text-navy flex-1 truncate">{t.name}</span>
                        <span className="text-[10px] font-black text-gray-muted shrink-0">{t.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Separador ── */}
            <div className="mx-4 flex items-center gap-2 shrink-0">
              <div className="flex-1 border-t border-gray-border/60" />
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-muted px-1">Obras em Curso</span>
              <div className="flex-1 border-t border-gray-border/60" />
            </div>

            {/* ── Secção inferior: Obras progresso + orçamento ── */}
            <div className="flex-1 overflow-y-auto px-4 py-2.5 space-y-2.5">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-8 w-full" />)
              ) : obrasInsight.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[11px] text-gray-muted">Sem obras ativas com dados</p>
                </div>
              ) : (
                obrasInsight.map((o) => {
                  const progColor = o.prog >= 80 ? '#10b981' : o.prog >= 50 ? '#2563eb' : '#f59e0b';
                  const riscoColor = o.risco === 'alto' ? 'text-error' : o.risco === 'medio' ? 'text-warning' : 'text-success';
                  const tecNome = (o.executante as any)?.full_name?.split(' ')[0] ?? null;
                  const local = o.localizacao || o.cliente;
                  return (
                    <div key={o.id} className="space-y-1">
                      {/* Topo: Nome da obra + Badge do técnico */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold text-navy truncate leading-tight flex-1">{o.nome}</p>
                        {tecNome && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-blue-50 text-accent-blue text-[9px] font-bold leading-none">
                            {tecNome}
                          </span>
                        )}
                      </div>
                      {/* Barra de progresso */}
                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${o.prog}%`, backgroundColor: progColor }} />
                      </div>
                      {/* Rodapé: Localização + percentagem */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin size={9} className="text-gray-muted shrink-0" />
                          <span className="text-[9px] text-gray-muted truncate">{local}</span>
                        </div>
                        <span className={`text-[9px] font-black shrink-0 ${riscoColor}`}>{o.prog}%</span>
                      </div>
                      {/* Barra de orçamento */}
                      {o.orcamento && o.budgetPct !== null && (
                        <div className="space-y-0.5 mt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] text-gray-muted">Orçamento</span>
                            <span className="text-[8px] font-black" style={{ color: o.budgetColor ?? undefined }}>{o.budgetPct?.toFixed(0)}%</span>
                          </div>
                          <div className="h-1 w-full rounded-full bg-gray-100">
                            <div className="h-full rounded-full" style={{ width: `${o.budgetPct}%`, backgroundColor: o.budgetColor ?? undefined }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Linha 2: Dados — flex-1 ──────────────────────────────────────── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-3">

          {/* Performance da Equipa — col-span-3 (grid de cards compactos) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-gray-border/60 shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Equipa · {cicloLabel}</p>
              <h3 className="text-[13px] font-bold text-navy">Resumo da Equipa</h3>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-28" />)}
                </div>
              ) : performanceTecnicos.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-gray-muted">Sem dados de performance ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {performanceTecnicos.map((t) => {
                    const carga = Math.min((t.horasMes / MONTHLY_TARGET) * 100, 100);
                    const cargaColor = carga > 90 ? '#ef4444' : carga > 70 ? '#f59e0b' : '#10b981';
                    const extraPct = t.horasMes > 0 ? Math.round((t.horasExtraMes / t.horasMes) * 100) : 0;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          'rounded-xl border p-3 space-y-2',
                          t.isSaldoCritico ? 'border-error/50 bg-red-50/40' : 'border-gray-border bg-white'
                        )}
                      >
                        {/* Topo: Avatar + Nome + Badge crítico */}
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden">
                            {t.avatar_url
                              ? <img src={t.avatar_url} alt={t.full_name} className="w-full h-full object-cover" />
                              : <span className="text-[9px] font-black text-white">{getInitials(t.full_name)}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-navy truncate leading-tight">{t.full_name.split(' ')[0]}</p>
                            {t.isSaldoCritico && (
                              <span className="px-1.5 py-0.5 rounded-md bg-error/10 text-error text-[8px] font-black">Saldo Crítico</span>
                            )}
                          </div>
                        </div>

                        {/* Horas do mês + % extra */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-gray-muted">Horas este mês</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-navy">{fmtH(t.horasMes)}</span>
                            {extraPct > 0 && (
                              <span className="text-[8px] font-bold text-warning">{extraPct}% ext.</span>
                            )}
                          </div>
                        </div>

                        {/* Barra de carga mensal */}
                        <div className="space-y-0.5">
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${carga}%`, backgroundColor: cargaColor }}
                            />
                          </div>
                          <span className="text-[8px] text-gray-muted">{carga.toFixed(0)}% de {MONTHLY_TARGET}h</span>
                        </div>

                        {/* Despesas + Saldo */}
                        <div className="flex items-center justify-between pt-0.5 border-t border-gray-border/50">
                          <span className="text-[9px] text-gray-muted">Desp. <span className="font-bold text-error">{eur(t.custoDespesas)}</span></span>
                          <span className={cn('text-[9px] font-black', t.saldo >= 0 ? 'text-success' : 'text-error')}>
                            {t.saldo >= 0 ? '+' : ''}{eur(t.saldo)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Col direita: Fluxo de Caixa — col-span-2, flex-1 (ocupa toda a altura) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-gray-border/60 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Fundo de Maneio</p>
                <h3 className="text-[12px] font-bold text-navy">Fluxo de Caixa</h3>
              </div>
              <div className="flex gap-2.5 text-[9px] font-semibold text-gray-muted">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />Entrada</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-error inline-block" />Gasto</span>
              </div>
            </div>
            <div className="flex-1 min-h-0 px-2 py-3">
              {isLoading ? <Sk className="w-full h-full rounded-lg" /> : fluxoCaixaData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-gray-muted">Sem dados ainda</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={fluxoCaixaData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                    barCategoryGap="30%"
                    barGap={3}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8896ae', fontSize: 9, fontWeight: 600 }}
                      tickFormatter={(v) => `${v}€`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#3d4f6e', fontSize: 10, fontWeight: 700 }}
                      width={52}
                    />
                    <Tooltip content={<TooltipEur />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="Depositado" fill="#10b981" radius={[0, 3, 3, 0]} maxBarSize={12} />
                    <Bar dataKey="Gasto" fill="#ef4444" radius={[0, 3, 3, 0]} maxBarSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Aprovações Pendentes — largura total ──────────────────────────── */}
      <div className="shrink-0 bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-border/60 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Ação Necessária</p>
            <h3 className="text-[13px] font-bold text-navy">Aprovações Pendentes</h3>
          </div>
          {pendentesCombo.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-accent-blue text-[9px] font-bold">
                <Timer size={9} /> {apontamentos.filter(a => a.status === 'pendente').length} apt.
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[9px] font-bold">
                <Receipt size={9} /> {despesas.filter(d => d.status === 'pendente').length} desp.
              </span>
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-warning/15 text-warning text-[10px] font-black flex items-center justify-center">
                {pendentesCombo.length}
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-border/30">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Sk className="w-[3px] h-8 rounded-full shrink-0" />
                <Sk className="h-5 w-20 rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Sk className="h-3 w-40" /><Sk className="h-2.5 w-28" />
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Sk className="h-7 w-20 rounded-lg" /><Sk className="h-7 w-7 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : pendentesCombo.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-3.5">
            <CheckCircle2 size={14} className="text-success" />
            <p className="text-xs font-semibold text-navy">Tudo em dia — sem aprovações pendentes</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-border/30 max-h-[264px] overflow-y-auto">
            {pendentesCombo.map((item) => {
              const isApt = item.tipo === 'apontamento';
              return (
                <div key={`${item.tipo}-${item.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-bg/40 transition-colors">
                  {/* Barra lateral colorida por tipo */}
                  <div className={cn('w-[3px] self-stretch rounded-full shrink-0 min-h-[36px]', isApt ? 'bg-accent-blue' : 'bg-amber-400')} />

                  {/* Badges: tipo + atraso */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold leading-none',
                      isApt ? 'bg-blue-50 text-accent-blue' : 'bg-amber-50 text-amber-600'
                    )}>
                      {isApt ? <Timer size={9} /> : <Receipt size={9} />}
                      <span className="hidden sm:inline">{isApt ? 'Apontamento' : 'Despesa'}</span>
                    </div>
                    {item.isOld && (
                      <span className="px-1.5 rounded-md bg-error/10 text-error text-[8px] font-black">Atrasado</span>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-navy truncate leading-tight">
                      {item.tecnicoNome.split(' ')[0]} · {item.obraNome}
                    </p>
                    <p className="text-[10px] text-gray-muted leading-tight mt-0.5">
                      {item.subtitulo} · {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>

                  {/* Botões de acção — cores sólidas para acessibilidade */}
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => isApt
                        ? updateAptStatus.mutate({ id: item.id, status: 'aprovado' })
                        : updateDespStatus.mutate({ id: item.id, status: 'aprovada' })
                      }
                      disabled={updateAptStatus.isPending || updateDespStatus.isPending}
                      className="h-7 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1 text-[10px] font-bold"
                    >
                      <CheckCircle2 size={11} /> Aprovar
                    </button>
                    <button
                      onClick={() => isApt
                        ? updateAptStatus.mutate({ id: item.id, status: 'rejeitado' })
                        : updateDespStatus.mutate({ id: item.id, status: 'rejeitada' })
                      }
                      disabled={updateAptStatus.isPending || updateDespStatus.isPending}
                      className="h-7 w-7 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                      title="Rejeitar"
                    >
                      <XCircle size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Floating Badge de Pendentes ───────────────────────────────────── */}
      {(kpis.pendentesApt + kpis.pendentesDsp) > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-warning text-white px-3 py-2 rounded-full shadow-lg shadow-warning/30 text-[11px] font-black">
          <AlertCircle size={13} />
          {kpis.pendentesApt + kpis.pendentesDsp} pendente{(kpis.pendentesApt + kpis.pendentesDsp) > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
