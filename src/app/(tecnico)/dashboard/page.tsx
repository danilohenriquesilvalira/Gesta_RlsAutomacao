'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  BedDouble, Utensils, Bus, Fuel, Package, Tag,
  ArrowDownToLine, CreditCard, Ticket,
  CheckCircle2, Building2,
  ReceiptText, ChevronUp, ChevronLeft, ChevronRight, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Label,
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useDepositos, useSaldoTecnico, useDespesas } from '@/lib/queries/despesas';
import { useApontamentos } from '@/lib/queries/apontamentos';
import { useObras } from '@/lib/queries/obras';
import { createClient } from '@/lib/supabase/client';
import type { Deposito, DespesaStatus, TipoDespesa } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function eur(val: number) {
  return val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtH(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}
function shortServ(s: string): string {
  const m: Record<string, string> = {
    'Instalação Elétrica': 'Inst. Elétrica',
    'Prog. CLP': 'Prog. CLP',
    'Instrumentação': 'Instrumentação',
    'Comissionamento': 'Comissionamento',
    'Manutenção Corretiva': 'Mant. Corretiva',
    'Manutenção Preventiva': 'Mant. Preventiva',
  };
  return m[s] ?? s;
}

const MES_KEY = new Date().toISOString().slice(0, 7);
const MES_LABEL = new Date().toLocaleDateString('pt-PT', { month: 'long' });

// ── Tipo de despesa ───────────────────────────────────────────────────────────

const TIPO_ICON: Record<TipoDespesa, React.ReactNode> = {
  alojamento: <BedDouble size={15} />, alimentação: <Utensils size={15} />,
  transporte: <Bus size={15} />, combustível: <Fuel size={15} />,
  material: <Package size={15} />, outro: <Tag size={15} />,
};
const TIPO_BG: Record<TipoDespesa, string> = {
  alojamento: 'bg-purple-50 border-purple-100 text-purple-500',
  alimentação: 'bg-orange-50 border-orange-100 text-orange-500',
  transporte: 'bg-sky-50 border-sky-100 text-sky-500',
  combustível: 'bg-yellow-50 border-yellow-100 text-yellow-600',
  material: 'bg-teal-50 border-teal-100 text-teal-600',
  outro: 'bg-gray-50 border-gray-200 text-gray-500',
};
const DESP_STATUS_LABEL: Record<DespesaStatus, string> = {
  pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada',
};
const DESP_STATUS_COLOR: Record<DespesaStatus, string> = {
  pendente: 'text-amber-500', aprovada: 'text-emerald-500', rejeitada: 'text-red-500',
};

// ── Chip ─────────────────────────────────────────────────────────────────────

function ChipIcon() {
  return (
    <svg width="36" height="26" viewBox="0 0 38 28" fill="none">
      <rect width="38" height="28" rx="5" fill="url(#cg)" />
      <rect x="13" y="0" width="12" height="28" fill="rgba(0,0,0,0.08)" />
      <rect x="0" y="9" width="38" height="10" fill="rgba(0,0,0,0.08)" />
      <rect x="13" y="9" width="12" height="10" fill="rgba(0,0,0,0.15)" />
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="38" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e8d58a" /><stop offset="100%" stopColor="#c9a84c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-border/60 ${className}`} />;
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function TecnicoDashboardPage() {
  const { profile } = useAuth();
  const [showDespesasMobile, setShowDespesasMobile] = useState(false);

  // Paginação
  const ITEMS_PER_PAGE = 4;
  const [pageDesp, setPageDesp] = useState(0);
  const [pageDep, setPageDep] = useState(0);

  const { data: depositos = [], isLoading: ldep } = useDepositos(profile?.id);
  const { data: despesas = [], isLoading: ldesp } = useDespesas(profile ? { tecnicoId: profile.id } : undefined);
  const { data: apontamentos = [], isLoading: lapt } = useApontamentos(profile ? { tecnicoId: profile.id } : undefined);
  const { data: obras = [], isLoading: lobras } = useObras('ativa');

  const { totalDepositado, totalDespesasAprovadas, saldo } = useSaldoTecnico(profile?.id ?? '');

  const totalPendente = useMemo(
    () => despesas.filter(d => d.status === 'pendente').reduce((s, d) => s + Number(d.valor), 0),
    [despesas]
  );
  const despPendentesCount = useMemo(
    () => despesas.filter(d => d.status === 'pendente').length,
    [despesas]
  );
  const percentConsumido = totalDepositado > 0
    ? Math.min((totalDespesasAprovadas / totalDepositado) * 100, 100) : 0;

  // Stats apontamentos
  const horasMes = useMemo(
    () => apontamentos.filter(a => a.data_apontamento.startsWith(MES_KEY)).reduce((s, a) => s + (a.total_horas ?? 0), 0),
    [apontamentos]
  );
  const aptPendentes = useMemo(() => apontamentos.filter(a => a.status === 'pendente').length, [apontamentos]);
  const aptAprovados = useMemo(() => apontamentos.filter(a => a.status === 'aprovado').length, [apontamentos]);
  const aptRejeitados = useMemo(() => apontamentos.filter(a => a.status === 'rejeitado').length, [apontamentos]);

  const tipoHoraStats = useMemo(() => {
    const aprov = apontamentos.filter(a => a.status === 'aprovado');
    return {
      normal:   aprov.filter(a => a.tipo_hora === 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0),
      extra50:  aprov.filter(a => a.tipo_hora === 'extra_50').reduce((s, a) => s + (a.total_horas ?? 0), 0),
      extra100: aprov.filter(a => a.tipo_hora === 'extra_100').reduce((s, a) => s + (a.total_horas ?? 0), 0),
    };
  }, [apontamentos]);

  const servicoStats = useMemo(() => {
    const map: Record<string, number> = {};
    apontamentos.filter(a => a.status === 'aprovado').forEach(a => {
      const s = a.tipo_servico ?? 'Outro';
      map[s] = (map[s] ?? 0) + (a.total_horas ?? 0);
    });
    const total = Object.values(map).reduce((acc, v) => acc + v, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([nome, horas]) => ({ nome, horas, pct: total > 0 ? Math.round((horas / total) * 100) : 0 }));
  }, [apontamentos]);

  const obraStats = useMemo(() => {
    const map: Record<string, { nome: string; horas: number; progresso: number }> = {};
    apontamentos.forEach(a => {
      if (!a.obra_id || !a.obra) return;
      if (!map[a.obra_id]) {
        map[a.obra_id] = { nome: a.obra.nome, horas: 0, progresso: a.obra.progresso ?? 0 };
      }
      map[a.obra_id].horas += a.total_horas ?? 0;
    });
    return Object.values(map).sort((a, b) => b.horas - a.horas).slice(0, 4);
  }, [apontamentos]);

  // ── Work Charts Data ───────────────────────────────────────────────────────
  const workPulseData = useMemo(() => [
    { name: 'Aprovados', value: aptAprovados, color: '#10b981' },
    { name: 'Pendentes', value: aptPendentes, color: '#f59e0b' },
    { name: 'Rejeitados', value: aptRejeitados, color: '#ef4444' },
  ].filter(d => d.value > 0), [aptAprovados, aptPendentes, aptRejeitados]);


  const isLoading = ldep || ldesp;
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Técnico';

  // ── Realtime ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    const supabase = createClient();
    const ch = supabase.channel(`dep-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'depositos', filter: `tecnico_id=eq.${profile.id}` },
        (payload) => {
          const d = payload.new as Deposito;
          toast.success(`Novo depósito: ${eur(Number(d.valor))}`, {
            description: d.descricao || 'O administrador efectuou um depósito na sua conta.',
            duration: 8000,
          });
        }
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id]);

  // ── Despesas body content
  const totalPagesDesp = Math.ceil(despesas.length / ITEMS_PER_PAGE);
  const currentDespesas = useMemo(() =>
    despesas.slice(pageDesp * ITEMS_PER_PAGE, (pageDesp + 1) * ITEMS_PER_PAGE),
    [despesas, pageDesp]
  );

  const despesasBodyContent = isLoading ? (
    Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
      <div key={i} className="px-5 py-3.5 flex items-center justify-between border-b border-gray-border/50 last:border-0">
        <div className="flex items-center gap-3">
          <Sk className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5"><Sk className="h-3 w-24" /><Sk className="h-2.5 w-16" /></div>
        </div>
        <Sk className="h-4 w-14" />
      </div>
    ))
  ) : currentDespesas.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-6 text-center px-6 h-[220px]">
      <div className="w-10 h-10 rounded-xl border border-gray-border bg-gray-bg flex items-center justify-center text-gray-muted mb-3">
        <Ticket size={16} />
      </div>
      <p className="text-sm font-semibold text-navy">Sem despesas</p>
      <p className="text-xs text-gray-muted mt-0.5">Nenhuma despesa registada.</p>
    </div>
  ) : (
    <div className="h-[220px]">
      {currentDespesas.map((desp) => (
        <div key={desp.id} className="px-5 py-3 flex items-center justify-between border-b border-gray-border/50 last:border-0 hover:bg-gray-bg/50 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${TIPO_BG[desp.tipo_despesa] ?? 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              {TIPO_ICON[desp.tipo_despesa]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-navy capitalize">{desp.tipo_despesa}</p>
                <span className={`text-[10px] font-bold ${DESP_STATUS_COLOR[desp.status]}`}>· {DESP_STATUS_LABEL[desp.status]}</span>
              </div>
              <p className="text-[11px] text-gray-muted truncate">{desp.obra?.nome ?? 'Oficina'} · {fmtDate(desp.data_despesa)}</p>
            </div>
          </div>
          <span className={`shrink-0 text-sm font-black ml-2 ${desp.status === 'aprovada' ? 'text-error' : 'text-gray-muted'}`}>
            -{eur(Number(desp.valor))}
          </span>
        </div>
      ))}
    </div>
  );

  // ── Depósitos body content
  const totalPagesDep = Math.ceil(depositos.length / ITEMS_PER_PAGE);
  const currentDepositos = useMemo(() =>
    depositos.slice(pageDep * ITEMS_PER_PAGE, (pageDep + 1) * ITEMS_PER_PAGE),
    [depositos, pageDep]
  );

  const depositosBodyContent = isLoading ? (
    Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
      <div key={i} className="px-5 py-4 flex items-center justify-between border-b border-gray-border/50 last:border-0">
        <div className="flex items-center gap-3">
          <Sk className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5"><Sk className="h-3 w-28" /><Sk className="h-2.5 w-16" /></div>
        </div>
        <Sk className="h-4 w-20" />
      </div>
    ))
  ) : currentDepositos.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-6 text-center px-6 h-[220px]">
      <div className="w-10 h-10 rounded-xl border border-gray-border bg-gray-bg flex items-center justify-center text-gray-muted mb-3">
        <CreditCard size={16} />
      </div>
      <p className="text-sm font-semibold text-navy">Sem depósitos</p>
      <p className="text-xs text-gray-muted mt-0.5">Aguarda o primeiro depósito.</p>
    </div>
  ) : (
    <div className="h-[220px]">
      {currentDepositos.map((dep) => (
        <div key={dep.id} className="px-5 py-3 flex items-center justify-between border-b border-gray-border/50 last:border-0 hover:bg-gray-bg/50 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-success">
              <ArrowDownToLine size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-navy truncate">{dep.descricao || 'Depósito'}</p>
              <p className="text-[11px] text-gray-muted">{fmtDate(dep.data_deposito)}</p>
            </div>
          </div>
          <span className="shrink-0 text-sm font-black text-success ml-3">+{eur(Number(dep.valor))}</span>
        </div>
      ))}
    </div>
  );

  // ── Chart Data & Tooltip ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (isLoading) return [];
    const data: Record<string, { date: string, dep: number, gas: number, pen: number }> = {};
    const days = 15;
    const datesArr = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().split('T')[0];
    });

    datesArr.forEach(day => {
      data[day] = {
        date: day.split('-').reverse().slice(0, 2).reverse().join('/'),
        dep: 0, gas: 0, pen: 0
      };
    });

    depositos.forEach(d => {
      if (data[d.data_deposito]) data[d.data_deposito].dep += Number(d.valor);
    });
    despesas.forEach(d => {
      if (data[d.data_despesa]) {
        if (d.status === 'aprovada') data[d.data_despesa].gas += Number(d.valor);
        else if (d.status === 'pendente') data[d.data_despesa].pen += Number(d.valor);
      }
    });

    return Object.values(data);
  }, [depositos, despesas, isLoading]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-border p-3 rounded-xl shadow-xl">
          <p className="text-[10px] font-black text-gray-muted uppercase mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[11px] font-medium text-navy capitalize">{entry.name}</span>
                </div>
                <span className="text-[11px] font-black text-navy">{eur(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-4 lg:h-full lg:flex lg:flex-col lg:space-y-0 lg:gap-3 lg:pb-0">

      {/* ── Saudação ── */}
      <div className="lg:shrink-0">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Bem-vindo</p>
        <h1 className="text-2xl font-black text-navy tracking-tight mt-0.5">{firstName}</h1>
      </div>

      {/* BLOCO 1 wrapper */}
      <div className="space-y-4 lg:flex-1 lg:min-h-[420px] lg:space-y-0">
        <div className="grid grid-cols-1 lg:grid-cols-5 lg:grid-rows-[auto_1fr] gap-4 lg:h-full">

          {/* Cartão de Saldo — col 1-3 */}
          <div
            className="lg:col-span-3 lg:row-start-1 relative rounded-2xl overflow-hidden select-none"
            style={{ background: '#0a1628' }}
          >
            <div className="absolute rounded-full pointer-events-none" style={{ width: 260, height: 260, right: -70, top: -70, background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />
            <div className="absolute rounded-full pointer-events-none" style={{ width: 70, height: 70, left: '40%', top: -18, background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />

            <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-5 min-h-[220px]">

              {/* ── TOPO: Chip + tipo de conta ── */}
              <div className="flex items-center justify-between">
                <ChipIcon />
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[9px] font-black tracking-[0.25em] text-white/25 uppercase">Conta</p>
                    <p className="text-[11px] font-bold text-white/45">Pessoal</p>
                  </div>
                  <button
                    onClick={() => setShowDespesasMobile(v => !v)}
                    className="lg:hidden relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 border border-white/10"
                    style={{
                      background: showDespesasMobile ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    {showDespesasMobile ? <ChevronUp size={14} className="text-white" /> : <ReceiptText size={14} className="text-white/70" />}
                  </button>
                </div>
              </div>

              {/* ── CENTRO: Saldo + barra de consumo ── */}
              <div className="flex-1 flex flex-col justify-center gap-3">
                <div>
                  <p className="text-[10px] font-black tracking-[0.22em] text-white/35 uppercase mb-1.5">Saldo Disponível</p>
                  {isLoading
                    ? <div className="h-9 w-48 rounded-lg bg-white/10 animate-pulse" />
                    : <p className="text-[36px] font-black text-white leading-none tracking-tight">{eur(Math.max(saldo, 0))}</p>
                  }
                </div>
                {!isLoading && totalDepositado > 0 && (
                  <div>
                    <div className="flex justify-between text-[9px] font-black uppercase text-white/30 mb-1.5">
                      <span className="tracking-widest">Consumido</span>
                      <span className="text-white/50">{percentConsumido.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-500" style={{ width: `${percentConsumido}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* ── RODAPÉ: Titular ── */}
              <div className="flex items-end justify-between mt-auto">
                <div>
                  <p className="text-[8px] text-white/25 uppercase tracking-[0.2em] font-black mb-0.5">Titular</p>
                  <p className="text-[12px] font-black text-white uppercase tracking-wider leading-none">{profile?.full_name ?? '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-white/25 uppercase tracking-[0.2em] font-black mb-0.5">Função</p>
                  <p className="text-[10px] font-bold text-white/40 leading-none">Técnico</p>
                </div>
              </div>

            </div>
          </div>

          {/* Gráfico de Despesas — col 1-3 row 2 */}
          <div
            className="hidden lg:flex lg:col-span-3 lg:row-start-2 lg:h-full bg-white rounded-xl border overflow-hidden flex-col shadow-md"
            style={{ borderColor: '#D1D5DB' }}
          >
            <div className="px-4 py-2.5 border-b flex items-center justify-between shrink-0" style={{ borderColor: '#D1D5DB' }}>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Fundo de Maneio</p>
                <h3 className="text-[13px] font-bold text-navy">Fluxo de Despesas</h3>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-muted uppercase leading-none mb-1">Recebido</p>
                  <p className="text-[14px] font-black text-emerald-500 leading-tight">{eur(totalDepositado)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-muted uppercase leading-none mb-1">Aprovado</p>
                  <p className="text-[14px] font-black text-red-500 leading-tight">{eur(totalDespesasAprovadas)}</p>
                </div>
                <div className="text-right border-l border-gray-border pl-6">
                  <p className="text-[9px] font-black text-gray-muted uppercase leading-none mb-1">Em Aprovação</p>
                  <p className="text-[14px] font-black text-amber-500 leading-tight">{eur(totalPendente)}</p>
                </div>
              </div>
            </div>
            <div className="w-full p-4 h-[260px] lg:flex-1 lg:min-h-0">
              {isLoading ? (
                <div className="w-full h-full flex flex-col gap-2 p-3"><Sk className="flex-1 w-full" /><div className="flex gap-2 h-4"><Sk className="flex-1" /><Sk className="flex-1" /></div></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colDep" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                      <linearGradient id="colGas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="dep" name="Recebido" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colDep)" activeDot={{ r: 4, strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="gas" name="Gasto" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colGas)" activeDot={{ r: 4, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Atividade — col 4-5 row 1 */}
          <div
            className="hidden lg:flex lg:flex-col lg:col-span-2 lg:col-start-4 lg:row-start-1 bg-white rounded-xl border overflow-hidden shadow-md"
            style={{ borderColor: '#D1D5DB' }}
          >
            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: '#D1D5DB' }}>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Atividade</p>
                <h3 className="text-[13px] font-bold text-navy">Despesas Recentes</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-bg border border-gray-border rounded-lg p-0.5 mr-1">
                  <button onClick={() => setPageDesp(p => Math.max(0, p - 1))} disabled={pageDesp === 0} className="p-1 hover:bg-gray-border/30 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronLeft size={14} /></button>
                  <span className="text-[10px] font-bold text-navy px-1.5 min-w-[30px] text-center">{pageDesp + 1}/{Math.max(1, totalPagesDesp)}</span>
                  <button onClick={() => setPageDesp(p => Math.min(totalPagesDesp - 1, p + 1))} disabled={pageDesp >= totalPagesDesp - 1} className="p-1 hover:bg-gray-border/30 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronRight size={14} /></button>
                </div>
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-error"><Ticket size={15} /></div>
              </div>
            </div>
            <div className="lg:flex-1 lg:overflow-hidden">{despesasBodyContent}</div>
          </div>

          {/* Histórico — col 4-5 row 2 */}
          <div
            className="hidden lg:flex lg:flex-col lg:h-full lg:col-span-2 lg:col-start-4 lg:row-start-2 bg-white rounded-xl border overflow-hidden shadow-md"
            style={{ borderColor: '#D1D5DB' }}
          >
            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: '#D1D5DB' }}>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Histórico</p>
                <h3 className="text-[13px] font-bold text-navy">Depósitos Recebidos</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-bg border border-gray-border rounded-lg p-0.5 mr-1">
                  <button onClick={() => setPageDep(p => Math.max(0, p - 1))} disabled={pageDep === 0} className="p-1 hover:bg-gray-border/30 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronLeft size={14} /></button>
                  <span className="text-[10px] font-bold text-navy px-1.5 min-w-[30px] text-center">{pageDep + 1}/{Math.max(1, totalPagesDep)}</span>
                  <button onClick={() => setPageDep(p => Math.min(totalPagesDep - 1, p + 1))} disabled={pageDep >= totalPagesDep - 1} className="p-1 hover:bg-gray-border/30 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronRight size={14} /></button>
                </div>
                <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue"><CreditCard size={15} /></div>
              </div>
            </div>
            <div className="lg:flex-1 lg:overflow-hidden">{depositosBodyContent}</div>
          </div>
        </div>

        {/* Mobile Views */}
        <div className="lg:hidden space-y-4">
          <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: showDespesasMobile ? '500px' : '0px', opacity: showDespesasMobile ? 1 : 0 }}>
            <div className="bg-white rounded-xl border border-gray-border overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 border-b border-gray-border flex items-center justify-between">
                <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Atividade</p><h3 className="text-[13px] font-bold text-navy">Despesas Recentes</h3></div>
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-error"><Ticket size={15} /></div><button onClick={() => setShowDespesasMobile(false)} className="w-8 h-8 rounded-lg bg-gray-border/30 flex items-center justify-center text-gray-muted"><ChevronUp size={14} /></button></div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>{despesasBodyContent}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-border overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-border flex items-center justify-between">
              <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Histórico</p><h3 className="text-[13px] font-bold text-navy">Depósitos Recebidos</h3></div>
              <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue"><CreditCard size={15} /></div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>{depositosBodyContent}</div>
          </div>
        </div>
      </div>

      {/* BLOCO 2 — Performance compacta (shrink-0: ocupa só o necessário) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:shrink-0">

        {/* Pulso de Trabalho — 3 secções horizontais */}
        <div
          className="lg:col-span-3 bg-white rounded-xl border overflow-hidden shadow-md"
          style={{ borderColor: '#D1D5DB' }}
        >
          <div className="flex flex-col sm:flex-row h-full">

            {/* Secção 1: Donut de estado */}
            <div className="flex-1 p-4 border-b sm:border-b-0 sm:border-r border-gray-100 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Estado</p>
                  <h3 className="text-[13px] font-bold text-navy leading-tight">Apontamentos</h3>
                </div>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={13} />
                </div>
              </div>
              <div className="relative flex-1 min-h-[110px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workPulseData.length ? workPulseData : [{ name: 'Nenhum', value: 1, color: '#f1f5f9' }]}
                      cx="50%" cy="50%"
                      innerRadius={36} outerRadius={50}
                      paddingAngle={workPulseData.length > 1 ? 4 : 0}
                      dataKey="value"
                    >
                      {(workPulseData.length ? workPulseData : [{ color: '#f1f5f9' }]).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                      <Label value={apontamentos.length} position="center" style={{ fontSize: 15, fontWeight: 900, fill: '#0f2147' }} />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-4 text-center pointer-events-none">
                  <p className="text-[7px] font-bold text-gray-muted uppercase">Registos</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 mt-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-bold text-gray-muted">Apr. ({aptAprovados})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[9px] font-bold text-gray-muted">Pend. ({aptPendentes})</span>
                </div>
                {aptRejeitados > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="text-[9px] font-bold text-gray-muted">Rej. ({aptRejeitados})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Secção 2: Por tipo de serviço */}
            <div className="flex-[1.3] p-4 border-b sm:border-b-0 sm:border-r border-gray-100 flex flex-col min-w-0">
              <div className="mb-3 shrink-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">Distribuição</p>
                <h3 className="text-[13px] font-bold text-navy leading-tight">Por Tipo de Serviço</h3>
              </div>
              {servicoStats.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[10px] text-gray-muted text-center">Sem dados aprovados</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center space-y-2.5">
                  {servicoStats.map((s, i) => {
                    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-semibold text-navy truncate max-w-[65%]">{shortServ(s.nome)}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] font-bold text-gray-muted">{fmtH(s.horas)}</span>
                            <span className="text-[9px] font-black" style={{ color: COLORS[i] }}>{s.pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${s.pct}%`, backgroundColor: COLORS[i] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Secção 3: Horas e tipo */}
            <div className="sm:w-44 bg-gray-bg/40 p-4 flex flex-col justify-center gap-3">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Este Mês</p>
                <p className="text-lg font-black text-navy leading-none">{fmtH(horasMes)}</p>
                <p className="text-[9px] font-bold text-gray-muted uppercase mt-0.5">trabalhadas</p>
              </div>
              <div className="pt-3 border-t border-gray-100 space-y-1.5">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tipo de Hora</p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-gray-500">Normal</span>
                  <span className="text-[10px] font-black text-navy">{fmtH(tipoHoraStats.normal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-amber-500">Extra 50%</span>
                  <span className="text-[10px] font-black text-navy">{fmtH(tipoHoraStats.extra50)}</span>
                </div>
                {tipoHoraStats.extra100 > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-red-400">Extra 100%</span>
                    <span className="text-[10px] font-black text-navy">{fmtH(tipoHoraStats.extra100)}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Obras em Curso — progress bars por obra */}
        <div
          className="lg:col-span-2 bg-white rounded-xl border overflow-hidden shadow-md"
          style={{ borderColor: '#D1D5DB' }}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Progresso</p>
                <h3 className="text-sm font-bold text-navy leading-tight">Obras em Curso</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-navy/5 rounded-lg px-2.5 py-1.5">
                <Building2 size={10} className="text-navy" />
                <span className="text-[10px] font-black text-navy">{obraStats.length || obras.length} obras</span>
              </div>
            </div>

            {/* Lista de obras com progress bars */}
            {obraStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-16 text-center">
                <p className="text-xs font-semibold text-navy">Sem apontamentos em obras</p>
                <p className="text-[10px] text-gray-muted mt-0.5">Registe horas para ver o progresso</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {obraStats.map((obra, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-semibold text-navy truncate max-w-[55%] leading-tight">{obra.nome}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-bold text-gray-400">{fmtH(obra.horas)}</span>
                        <span
                          className="text-[9px] font-black tabular-nums"
                          style={{ color: obra.progresso >= 80 ? '#10b981' : obra.progresso >= 50 ? '#2563eb' : '#f59e0b' }}
                        >
                          {obra.progresso}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${obra.progresso}%`,
                          background: obra.progresso >= 80
                            ? 'linear-gradient(to right, #059669, #10b981)'
                            : obra.progresso >= 50
                            ? 'linear-gradient(to right, #1d4ed8, #3b82f6)'
                            : 'linear-gradient(to right, #d97706, #f59e0b)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rodapé */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={11} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-navy">{obras.length} ativas na empresa</span>
              </div>
              <span className="text-[10px] font-black text-gray-muted">
                {apontamentos.length} registos
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
