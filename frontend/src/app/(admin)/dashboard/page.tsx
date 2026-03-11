'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { diasUteisMes } from '@/lib/utils/feriados';
import { useApontamentos, useUpdateApontamentoStatus } from '@/lib/queries/apontamentos';
import { useTecnicosComHoras } from '@/lib/queries/tecnicos';
import { useObras } from '@/lib/queries/obras';
import { useDespesas, useDepositos, useUpdateDespesaStatus, useCreateDeposito } from '@/lib/queries/despesas';import { useAuth } from '@/hooks/useAuth';import {
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Clock, Users, Building2, Wallet, AlertCircle, CheckCircle2, XCircle, Receipt, Timer, Bell,
  MapPin, User, ArrowDownCircle, ArrowUpCircle, TrendingUp, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApontamentoDetalheModal } from '@/components/admin/ApontamentoDetalheModal';
import { DespesaDetalheModal } from '@/components/admin/DespesaDetalheModal';
import { ObrasDetalheModal } from '@/components/admin/ObrasDetalheModal';
import { SaldoTecnicoModal } from '@/components/admin/SaldoTecnicoModal';
import type { Apontamento } from '@/types';
import type { Despesa, Obra, Profile } from '@/types';

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
  return <div className={`animate-pulse rounded-xl bg-gray-200/70 ${className}`} />;
}

const TIPO_COLORS: Record<string, string> = {
  Alojamento: '#8b5cf6', Alimentação: '#f97316', Combustível: '#eab308',
  Material: '#14b8a6', Outro: '#94a3b8',
};
const MONTHLY_TARGET = 176;

function TooltipCategoria({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-[11px]">
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.payload.color }} />
        <span className="font-bold text-navy">{d.payload.name}</span>
      </div>
      <p className="text-gray-muted">{eur(d.value)} · {d.payload.pct}%</p>
    </div>
  );
}

const BELL_PAGE_SIZE = 6;

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: apontamentos = [], isLoading: lApt } = useApontamentos();
  const { data: tecnicos = [], isLoading: lTec } = useTecnicosComHoras();
  const { data: obras = [], isLoading: lObras } = useObras();
  const { data: despesas = [], isLoading: lDesp } = useDespesas();
  const { data: depositos = [], isLoading: lDep } = useDepositos();
  const updateAptStatus  = useUpdateApontamentoStatus();
  const updateDespStatus = useUpdateDespesaStatus();
  const createDeposito   = useCreateDeposito();
  const isLoading = lApt || lTec || lDesp || lDep || lObras;

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nomeMes = now.toLocaleDateString('pt-PT', { month: 'long' });
  const nomeMesCap = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  // ── KPIs — mês vigente ────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const aptsMes = apontamentos.filter((a) => a.status === 'aprovado' && a.data_apontamento.startsWith(currentMonthStr));
    const horasAprovadas = aptsMes.reduce((s, a) => s + (a.total_horas ?? 0), 0);
    const tecnicosAtivos = new Set(aptsMes.map((a) => a.tecnico_id)).size;
    const obrasAtivas = obras.filter((o) => o.status === 'ativa').length;
    const custoMes = despesas
      .filter((d) => d.status === 'aprovada' && d.data_despesa.startsWith(currentMonthStr))
      .reduce((s, d) => s + Number(d.valor), 0);
    const totalDepositado = depositos.reduce((s, d) => s + Number(d.valor), 0);
    const totalGasto = despesas.filter((d) => d.status === 'aprovada').reduce((s, d) => s + Number(d.valor), 0);
    const saldoGlobal = totalDepositado - totalGasto;
    const pendentesApt = apontamentos.filter((a) => a.status === 'pendente').length;
    const pendentesDsp = despesas.filter((d) => d.status === 'pendente').length;
    return { horasAprovadas, tecnicosAtivos, obrasAtivas, custoMes, saldoGlobal, pendentesApt, pendentesDsp };
  }, [apontamentos, obras, despesas, depositos, currentMonthStr]);

  // ── Performance por técnico ───────────────────────────────────────────────
  const performanceTecnicos = useMemo(() => {
    return tecnicos.map((t) => {
      const aptsAll = apontamentos.filter((a) => a.tecnico_id === t.id && a.status === 'aprovado');
      const aptsMes = aptsAll.filter((a) => a.data_apontamento.startsWith(currentMonthStr));
      const horasNormal = aptsAll.filter((a) => a.tipo_hora === 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0);
      const horasExtra = aptsAll.filter((a) => a.tipo_hora !== 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0);
      const horasMes = aptsMes.reduce((s, a) => s + (a.total_horas ?? 0), 0);
      const horasExtraMes = aptsMes.filter((a) => a.tipo_hora !== 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0);
      const custoDespesas = despesas.filter((d) => d.tecnico_id === t.id && d.status === 'aprovada').reduce((s, d) => s + Number(d.valor), 0);
      const totalDep = depositos.filter((d) => d.tecnico_id === t.id).reduce((s, d) => s + Number(d.valor), 0);
      const saldo = totalDep - custoDespesas;
      const isSaldoCritico = saldo < 50;
      return { ...t, horasNormal, horasExtra, horasMes, horasExtraMes, custoDespesas, totalDep, saldo, isSaldoCritico };
    }).sort((a, b) => b.horasMes - a.horasMes);
  }, [tecnicos, apontamentos, despesas, depositos, currentMonthStr]);

  // ── Horas por técnico — mês vigente ──────────────────────────────────────
  const horasInsight = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const { total: diasUteisTotal, passados: diasUteisPassados } = diasUteisMes(year, month);
    const targetMes = diasUteisTotal * 8;
    const progPct = diasUteisTotal > 0 ? diasUteisPassados / diasUteisTotal : 0;
    const lista = performanceTecnicos
      .filter(t => t.horasMes > 0)
      .map(t => ({
        id: t.id,
        nome: t.full_name,
        avatar: (t as any).avatar_url ?? null,
        horasNormal: t.horasMes - t.horasExtraMes,
        horasExtra: t.horasExtraMes,
        horasTotal: t.horasMes,
      }))
      .sort((a, b) => b.horasTotal - a.horasTotal);
    const totalHoras = lista.reduce((s, t) => s + t.horasTotal, 0);
    return { lista, targetMes, progPct, diasUteisTotal, diasUteisPassados, diasUteisRestantes: diasUteisTotal - diasUteisPassados, totalHoras };
  }, [performanceTecnicos]);

  // ── Despesas por categoria — mês ──────────────────────────────────────────
  const custosPorTipoMes = useMemo(() => {
    const tipos = ['combustível', 'alimentação', 'alojamento', 'material', 'outro'];
    const despMes = despesas.filter((d) => d.status === 'aprovada' && d.data_despesa.startsWith(currentMonthStr));
    const total = despMes.reduce((s, d) => s + Number(d.valor), 0);
    return tipos.map((tipo) => {
      const label = tipo.charAt(0).toUpperCase() + tipo.slice(1);
      const value = despMes.filter((d) => d.tipo_despesa === tipo).reduce((s, d) => s + Number(d.valor), 0);
      return { name: label, value, color: TIPO_COLORS[label] ?? '#94a3b8', pct: total > 0 ? Math.round((value / total) * 100) : 0 };
    }).filter((t) => t.value > 0).sort((a, b) => b.value - a.value);
  }, [despesas, currentMonthStr]);

  // ── Obras ativas ──────────────────────────────────────────────────────────
  const obrasInsight = useMemo(() =>
    obras.filter((o) => o.status === 'ativa')
      .map((o) => {
        const custo = despesas.filter((d) => d.obra_id === o.id && d.status === 'aprovada').reduce((s, d) => s + Number(d.valor), 0);
        const prog = o.progresso ?? 0;
        const orcamento = (o as any).orcamento ?? null;
        const budgetPct = orcamento && orcamento > 0 ? Math.min((custo / orcamento) * 100, 100) : null;
        const totalHoras = apontamentos
          .filter((a) => a.obra_id === o.id && a.status === 'aprovado')
          .reduce((s, a) => s + (a.total_horas ?? 0), 0);
        // Unique technicians linked to this obra via apontamentos OR despesas
        const tecMap = new Map<string, { id: string; nome: string; avatar: string | null }>();
        apontamentos
          .filter((a) => a.obra_id === o.id && a.status !== 'rejeitado')
          .forEach((a) => {
            if (!tecMap.has(a.tecnico_id)) {
              tecMap.set(a.tecnico_id, {
                id: a.tecnico_id,
                nome: a.tecnico?.full_name ?? '?',
                avatar: (a.tecnico as any)?.avatar_url ?? null,
              });
            }
          });
        despesas
          .filter((d) => d.obra_id === o.id && d.status !== 'rejeitada')
          .forEach((d) => {
            if (!tecMap.has(d.tecnico_id)) {
              tecMap.set(d.tecnico_id, {
                id: d.tecnico_id,
                nome: d.tecnico?.full_name ?? '?',
                avatar: (d.tecnico as any)?.avatar_url ?? null,
              });
            }
          });
        // Also include technicians assigned via obra_tecnicos
        (o.obra_tecnicos ?? []).forEach((ot) => {
          if (!tecMap.has(ot.tecnico.id)) {
            tecMap.set(ot.tecnico.id, {
              id: ot.tecnico.id,
              nome: ot.tecnico.full_name,
              avatar: ot.tecnico.avatar_url ?? null,
            });
          }
        });
        const tecnicosAtivos = [...tecMap.values()];
        return {
          id: o.id, nome: o.nome, cliente: o.cliente,
          localizacao: (o as any).localizacao ?? null,
          prog, custo, orcamento, budgetPct, totalHoras, tecnicosAtivos,
        };
      })
      .sort((a, b) => b.prog - a.prog)
      .slice(0, 6),
    [obras, despesas, apontamentos, currentMonthStr]
  );

  // ── Pendentes ─────────────────────────────────────────────────────────────
  const pendentesCombo = useMemo(() => {
    const apts = apontamentos.filter((a) => a.status === 'pendente').map((a) => ({
      id: a.id, tipo: 'apontamento' as const,
      tecnicoId: a.tecnico_id,
      tecnicoNome: a.tecnico?.full_name ?? '—',
      avatarUrl: a.tecnico?.avatar_url ?? null,
      obraNome: a.obra?.nome ?? 'Oficina',
      subtitulo: `${a.tipo_servico} · ${fmtH(a.total_horas ?? 0)}`,
      data: a.data_apontamento,
      isOld: !a.data_apontamento.startsWith(currentMonthStr),
    }));
    const desps = despesas.filter((d) => d.status === 'pendente').map((d) => ({
      id: d.id, tipo: 'despesa' as const,
      tecnicoId: d.tecnico_id,
      tecnicoNome: d.tecnico?.full_name ?? '—',
      avatarUrl: d.tecnico?.avatar_url ?? null,
      obraNome: d.obra?.nome ?? '—',
      subtitulo: `${d.tipo_despesa.charAt(0).toUpperCase() + d.tipo_despesa.slice(1)} · ${eur(Number(d.valor))}`,
      data: d.data_despesa,
      isOld: !d.data_despesa.startsWith(currentMonthStr),
    }));
    return [...apts, ...desps].sort((a, b) => {
      if (a.isOld !== b.isOld) return a.isOld ? -1 : 1;
      return b.data.localeCompare(a.data);
    });
  }, [apontamentos, despesas, currentMonthStr]);

  const totalNotificacoes = pendentesCombo.length;

  // ── Estados dos modais ────────────────────────────────────────────────────
  const [selectedApt, setSelectedApt] = useState<Apontamento | null>(null);
  const [selectedDesp, setSelectedDesp] = useState<Despesa | null>(null);
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [selectedTecnicoSaldo, setSelectedTecnicoSaldo] = useState<Profile | null>(null);
  const [rejectDialogApt, setRejectDialogApt] = useState<{ open: boolean; ids: string[]; nota: string }>({ open: false, ids: [], nota: '' });
  const [rejectPendingApt, setRejectPendingApt] = useState(false);
  const [rejectDialogDesp, setRejectDialogDesp] = useState<{ open: boolean; ids: string[]; nota: string }>({ open: false, ids: [], nota: '' });
  const [rejectPendingDesp, setRejectPendingDesp] = useState(false);

  // ── Bell ──────────────────────────────────────────────────────────────────
  const [bellOpen, setBellOpen] = useState(false);
  const [bellPos, setBellPos] = useState({ top: 0, left: 0 });
  const [bellFilter, setBellFilter] = useState<'todos' | 'apontamento' | 'despesa'>('todos');

  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const bellDropdownRef = useRef<HTMLDivElement>(null);

  function openBell() {
    if (bellButtonRef.current) {
      const r = bellButtonRef.current.getBoundingClientRect();
      const dropW = 300;
      const left = Math.min(Math.max(8, r.right - dropW), window.innerWidth - dropW - 8);
      setBellPos({ top: r.bottom + 6, left });
    }
    setBellOpen(true);
  }

  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!bellButtonRef.current?.contains(t) && !bellDropdownRef.current?.contains(t)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  // ── Handlers modais ───────────────────────────────────────────────────────
  async function handleAprovarApt(id: string) {
    try { await updateAptStatus.mutateAsync({ id, status: 'aprovado' }); toast.success('Apontamento aprovado'); }
    catch { toast.error('Erro ao aprovar'); }
  }
  function handleRejeitarApt(ids: string[]) { setRejectDialogApt({ open: true, ids, nota: '' }); }
  async function handleConfirmRejeitarApt() {
    const { ids, nota } = rejectDialogApt;
    setRejectPendingApt(true);
    try {
      await Promise.all(ids.map(id => updateAptStatus.mutateAsync({ id, status: 'rejeitado', nota_rejeicao: nota.trim() || null })));
      toast.success('Apontamento rejeitado');
      setRejectDialogApt({ open: false, ids: [], nota: '' });
    } catch { toast.error('Erro ao rejeitar'); }
    finally { setRejectPendingApt(false); }
  }

  async function handleAprovarDesp(id: string) {
    try { await updateDespStatus.mutateAsync({ id, status: 'aprovada' }); toast.success('Despesa aprovada'); }
    catch { toast.error('Erro ao aprovar'); }
  }
  function handleRejeitarDesp(ids: string[]) { setRejectDialogDesp({ open: true, ids, nota: '' }); }
  async function handleConfirmRejeitarDesp() {
    const { ids, nota } = rejectDialogDesp;
    setRejectPendingDesp(true);
    try {
      await Promise.all(ids.map(id => updateDespStatus.mutateAsync({ id, status: 'rejeitada', nota_rejeicao: nota.trim() || null })));
      toast.success('Despesa rejeitada');
      setRejectDialogDesp({ open: false, ids: [], nota: '' });
    } catch { toast.error('Erro ao rejeitar'); }
    finally { setRejectPendingDesp(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-4 lg:h-full lg:flex lg:flex-col lg:pb-0">

      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-navy capitalize leading-tight">{nomeMesCap} {now.getFullYear()}</h1>
        </div>
        <div className="p-1">
          <button ref={bellButtonRef} onClick={() => bellOpen ? setBellOpen(false) : openBell()}
            className="relative w-9 h-9 rounded-xl border border-gray-border bg-white shadow-sm flex items-center justify-center hover:bg-gray-bg transition-colors"
            aria-label="Notificações">
            <Bell size={16} className={cn('transition-colors', bellOpen ? 'text-navy' : 'text-gray-muted')} />
            {totalNotificacoes > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[9px] font-black flex items-center justify-center leading-none">
                {totalNotificacoes > 9 ? '9+' : totalNotificacoes}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Bell dropdown ─────────────────────────────────────────────── */}
      {bellOpen && (() => {
        const lista = bellFilter === 'todos' ? pendentesCombo : pendentesCombo.filter(i => i.tipo === bellFilter);
        const visivel = lista.slice(0, BELL_PAGE_SIZE);
        const temMais = lista.length > BELL_PAGE_SIZE;
        const busy = updateAptStatus.isPending || updateDespStatus.isPending;
        return (
          <div ref={bellDropdownRef} className="fixed w-[300px] bg-white border border-gray-border rounded-2xl shadow-2xl z-[9999] overflow-hidden" style={{ top: bellPos.top, left: bellPos.left }}>
            <div className="px-4 py-3 border-b border-gray-border/50 flex items-center justify-between">
              <p className="text-[13px] font-black text-navy">Aprovações Pendentes</p>
              {pendentesCombo.length > 0 && <span className="bg-warning/15 text-warning text-[10px] font-black px-2 py-0.5 rounded-full border border-warning/20">{pendentesCombo.length}</span>}
            </div>
            <div className="flex gap-1 px-3 py-2 border-b border-gray-border/40">
              {([['todos','Todos',pendentesCombo.length],['apontamento','Apt.',kpis.pendentesApt],['despesa','Desp.',kpis.pendentesDsp]] as const).map(([key,label,count]) => (
                <button key={key} onClick={() => setBellFilter(key)}
                  className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all', bellFilter === key ? 'bg-navy text-white' : 'text-gray-muted hover:bg-gray-bg')}>
                  {label} {count > 0 && <span className="opacity-70">{count}</span>}
                </button>
              ))}
            </div>
            {lista.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <CheckCircle2 size={22} className="text-gray-muted/40" />
                <p className="text-[12px] font-semibold text-navy">Tudo em dia!</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-border/40 max-h-[280px] overflow-y-auto">
                  {visivel.map((item) => {
                    const isApt = item.tipo === 'apontamento';
                    return (
                      <div key={`${item.tipo}-${item.id}`}
                        className={cn('flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-bg/60 cursor-pointer', item.isOld && 'bg-amber-50/40')}
                        onClick={() => { setBellOpen(false); if (isApt) { const a = apontamentos.find(x => x.id === item.id); if (a) setSelectedApt(a); } else { const d = despesas.find(x => x.id === item.id); if (d) setSelectedDesp(d); } }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-wide mb-0.5" style={{ color: isApt ? '#3D5AFE' : '#FF9100' }}>{isApt ? 'Apontamento' : 'Despesa'}</p>
                          <p className="text-[11px] font-semibold text-navy truncate">{item.tecnicoNome.split(' ')[0]} · {item.subtitulo.split(' · ')[0]}</p>
                          <p className="text-[9px] text-gray-muted">{new Date(item.data + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}{item.isOld && ' · antigo'}</p>
                        </div>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => isApt ? updateAptStatus.mutate({ id: item.id, status: 'aprovado' }) : updateDespStatus.mutate({ id: item.id, status: 'aprovada' })} disabled={busy} title="Aprovar"
                            className="w-7 h-7 rounded-lg border border-gray-border text-gray-muted hover:border-success hover:text-success hover:bg-success/5 disabled:opacity-30 flex items-center justify-center transition-all">
                            <CheckCircle2 size={13} />
                          </button>
                          <button onClick={() => isApt ? updateAptStatus.mutate({ id: item.id, status: 'rejeitado' }) : updateDespStatus.mutate({ id: item.id, status: 'rejeitada' })} disabled={busy} title="Rejeitar"
                            className="w-7 h-7 rounded-lg border border-gray-border text-gray-muted hover:border-error hover:text-error hover:bg-error/5 disabled:opacity-30 flex items-center justify-center transition-all">
                            <XCircle size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {temMais && (
                  <div className="px-4 py-2 border-t border-gray-border/40">
                    <button onClick={() => { setBellOpen(false); navigate(bellFilter === 'despesa' ? '/despesas' : '/apontamentos'); }}
                      className="w-full text-[10px] font-bold text-accent-blue hover:underline flex items-center justify-center gap-1">
                      <Timer size={11} />Ver todas as {lista.length} pendências
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* ── 4 KPI cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Horas Aprovadas', sub: nomeMesCap,
            value: isLoading ? '—' : fmtH(kpis.horasAprovadas),
            icon: <Clock size={20} className="text-accent-blue" />, iconBg: 'bg-blue-50',
          },
          {
            label: 'Técnicos Ativos', sub: `${nomeMesCap} · com registo`,
            value: isLoading ? '—' : String(kpis.tecnicosAtivos),
            icon: <Users size={20} className="text-emerald-600" />, iconBg: 'bg-emerald-50',
          },
          {
            label: 'Obras em Curso', sub: 'estado ativa',
            value: isLoading ? '—' : String(kpis.obrasAtivas),
            icon: <Building2 size={20} className="text-violet-600" />, iconBg: 'bg-violet-50',
          },
          {
            label: 'Despesas do Mês', sub: nomeMesCap,
            value: isLoading ? '—' : eur(kpis.custoMes),
            icon: <Wallet size={20} className="text-orange-500" />, iconBg: 'bg-orange-50',
            small: true,
          },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-border/60">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${k.iconBg}`}>
                {k.icon}
              </div>
              {i === 4 - 1 && !isLoading && (kpis.pendentesApt + kpis.pendentesDsp) > 0 && (
                <span className="text-[10px] font-black text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">
                  {kpis.pendentesApt + kpis.pendentesDsp} pendentes
                </span>
              )}
            </div>
            <p className={cn('font-black text-navy tabular-nums leading-none', (k as any).small ? 'text-[18px]' : 'text-[26px]')}>{k.value}</p>
            <p className="text-[12px] font-semibold text-gray-text mt-1.5">{k.label}</p>
            <p className="text-[10px] text-gray-muted mt-0.5 capitalize">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Linha inferior: Pendentes + (Despesas | Obras) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:flex-1 lg:min-h-0">

        {/* Aprovações Pendentes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-border/60 overflow-hidden lg:flex lg:flex-col lg:min-h-0">
          <div className="px-5 py-4 border-b border-gray-border/40 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-black text-navy">Aprovações Pendentes</h2>
              <p className="text-[11px] text-gray-muted mt-0.5">
                {kpis.pendentesApt} apontamento{kpis.pendentesApt !== 1 ? 's' : ''} · {kpis.pendentesDsp} despesa{kpis.pendentesDsp !== 1 ? 's' : ''}
              </p>
            </div>
            {pendentesCombo.length > 0 && (
              <span className="w-7 h-7 rounded-full bg-warning/15 border border-warning/25 text-warning text-[12px] font-black flex items-center justify-center tabular-nums">
                {pendentesCombo.length}
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-14" />)}</div>
          ) : pendentesCombo.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CheckCircle2 size={30} className="text-gray-border" />
              <p className="text-[13px] font-semibold text-navy">Tudo em dia</p>
              <p className="text-[11px] text-gray-muted">Sem aprovações pendentes</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-border/40 max-h-[400px] overflow-y-auto lg:max-h-none lg:flex-1 lg:min-h-0">
              {pendentesCombo.map((item) => {
                const isApt = item.tipo === 'apontamento';
                const busy = updateAptStatus.isPending || updateDespStatus.isPending;
                return (
                  <div
                    key={`${item.tipo}-${item.id}`}
                    onClick={() => { if (isApt) { const a = apontamentos.find(x => x.id === item.id); if (a) setSelectedApt(a); } else { const d = despesas.find(x => x.id === item.id); if (d) setSelectedDesp(d); } }}
                    className={cn('flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-bg/30 transition-colors', item.isOld && 'bg-amber-50/30')}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 w-10 h-10 rounded-full bg-navy flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
                      {item.avatarUrl
                        ? <img src={item.avatarUrl} alt={item.tecnicoNome} className="w-full h-full object-cover object-center" />
                        : <span className="text-[12px] font-black text-white">{getInitials(item.tecnicoNome)}</span>
                      }
                    </div>
                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {isApt
                          ? <Clock size={9} style={{ color: '#3D5AFE' }} />
                          : <Receipt size={9} style={{ color: '#FF9100' }} />
                        }
                        <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: isApt ? '#3D5AFE' : '#FF9100' }}>
                          {isApt ? 'Apontamento' : 'Despesa'}
                        </span>
                        {item.isOld && <span className="text-[8px] font-bold text-error bg-error/10 px-1.5 py-0.5 rounded-full">Antigo</span>}
                      </div>
                      <p className="text-[12px] font-bold text-navy leading-tight truncate">
                        {item.tecnicoNome.split(' ')[0]}
                        <span className="text-gray-muted font-normal"> · {item.obraNome}</span>
                      </p>
                      <p className="text-[10px] text-gray-muted truncate mt-0.5">
                        {item.subtitulo} · {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    {/* Ações rápidas */}
                    <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => isApt ? updateAptStatus.mutate({ id: item.id, status: 'aprovado' }) : updateDespStatus.mutate({ id: item.id, status: 'aprovada' })}
                        disabled={busy} title="Aprovar rápido"
                        className="w-8 h-8 rounded-full border border-gray-border text-gray-muted hover:border-success hover:text-success hover:bg-success/8 disabled:opacity-40 flex items-center justify-center transition-all shadow-sm">
                        <CheckCircle2 size={14} strokeWidth={2} />
                      </button>
                      <button onClick={() => isApt ? updateAptStatus.mutate({ id: item.id, status: 'rejeitado' }) : updateDespStatus.mutate({ id: item.id, status: 'rejeitada' })}
                        disabled={busy} title="Rejeitar rápido"
                        className="w-8 h-8 rounded-full border border-gray-border text-gray-muted hover:border-error hover:text-error hover:bg-error/8 disabled:opacity-40 flex items-center justify-center transition-all shadow-sm">
                        <XCircle size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna direita: grid 2 colunas no topo (Despesas + Horas) + grid 2 colunas no fundo (Saldo + Obras) */}
        <div className="flex flex-col gap-3 lg:min-h-0 lg:overflow-hidden">

          {/* ── Despesas + Horas — lado a lado ───────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:flex-1 lg:min-h-0">

          {/* ── Despesas do mês ──────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-border/60 flex flex-col overflow-hidden min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-1 shrink-0">
              <h2 className="text-[14px] font-black text-navy">Despesas — {nomeMesCap}</h2>
              <span className="text-[13px] font-black text-navy tabular-nums">{isLoading ? '—' : eur(kpis.custoMes)}</span>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <Sk className="w-48 h-48 rounded-full" />
              </div>
            ) : custosPorTipoMes.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[12px] text-gray-muted">Sem despesas aprovadas este mês</p>
              </div>
            ) : (
              <>
                {/* Donut — ocupa todo o espaço livre */}
                <div className="flex-1 min-h-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={custosPorTipoMes}
                        cx="50%" cy="50%"
                        innerRadius="42%"
                        outerRadius="68%"
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {custosPorTipoMes.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<TooltipCategoria />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Texto central */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest">total</p>
                    <p className="text-[14px] font-black text-navy tabular-nums mt-0.5">{eur(kpis.custoMes)}</p>
                  </div>
                </div>

                {/* Legenda — linha compacta no fundo */}
                <div className="shrink-0 px-4 pb-4">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {custosPorTipoMes.slice(0, 6).map((t) => (
                      <div key={t.name} className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="text-[11px] font-semibold text-navy truncate flex-1">{t.name}</span>
                        <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: t.color }}>{t.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Horas dos Técnicos — mês vigente ─────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-border/60 flex flex-col overflow-hidden min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
              <div>
                <h2 className="text-[13px] font-black text-navy leading-none">Horas — {nomeMesCap}</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {horasInsight.diasUteisPassados}/{horasInsight.diasUteisTotal} dias úteis
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-black text-navy tabular-nums leading-none">
                  {isLoading ? '—' : `${Math.floor(horasInsight.totalHoras)}h`}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">registadas</p>
              </div>
            </div>

            {/* Barra de progresso do mês */}
            <div className="px-4 pb-3 shrink-0">
              <div className="h-[5px] w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-navy transition-all duration-700"
                  style={{ width: `${Math.round(horasInsight.progPct * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-gray-400">{Math.round(horasInsight.progPct * 100)}% do mês</span>
                <span className="text-[9px] text-gray-400">{horasInsight.diasUteisRestantes}d restantes</span>
              </div>
            </div>

            {isLoading ? (
              <div className="p-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-8 rounded-xl" />)}</div>
            ) : horasInsight.lista.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 py-8">
                <Clock size={22} className="text-gray-300" />
                <p className="text-[12px] text-gray-muted">Sem horas este mês</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-1.5">
                {horasInsight.lista.map((t) => {
                  const target = horasInsight.targetMes;
                  const pct = target > 0 ? Math.min((t.horasTotal / target) * 100, 100) : 0;
                  const isBehind = t.horasTotal < horasInsight.targetMes * horasInsight.progPct * 0.80;
                  const isAhead  = t.horasTotal > horasInsight.targetMes * horasInsight.progPct * 1.05;
                  const barColor = isBehind ? '#EF4444' : isAhead ? '#10B981' : '#1B2E4B';
                  return (
                    <div key={t.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="shrink-0 w-7 h-7 rounded-full bg-navy overflow-hidden flex items-center justify-center ring-2 ring-white shadow-sm">
                        {t.avatar
                          ? <img src={t.avatar} alt={t.nome} className="w-full h-full object-cover" />
                          : <span className="text-[9px] font-black text-white">{t.nome.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-bold text-navy truncate">{t.nome.split(' ')[0]}</span>
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            {t.horasExtra > 0 && (
                              <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded-md tabular-nums">
                                +{Math.floor(t.horasExtra)}h
                              </span>
                            )}
                            <span className="text-[10px] font-black tabular-nums" style={{ color: barColor }}>
                              {Math.floor(t.horasTotal)}h
                            </span>
                          </div>
                        </div>
                        <div className="h-[3px] w-full rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer: meta + extras */}
            {!isLoading && horasInsight.targetMes > 0 && (
              <div className="shrink-0 px-4 py-2.5 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[9px] text-gray-400">
                  <TrendingUp size={9} />
                  <span>Meta: {horasInsight.targetMes}h/técnico</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-gray-400">
                  <Zap size={9} />
                  <span>{horasInsight.lista.filter((t: { horasExtra: number }) => t.horasExtra > 0).length} c/ extras</span>
                </div>
              </div>
            )}
          </div>

          </div>{/* fim grid Despesas+Horas */}

          {/* ── Saldo + Obras — lado a lado ──────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:flex-1 lg:min-h-0">

          {/* ── Saldo dos Técnicos ─────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-border/60 p-4 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-[14px] font-black text-navy">Saldo dos Técnicos</h2>
              <span className={cn('text-[13px] font-black tabular-nums', kpis.saldoGlobal >= 0 ? 'text-navy' : 'text-error')}>
                {isLoading ? '—' : eur(kpis.saldoGlobal)}
              </span>
            </div>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-9" />)}</div>
            ) : performanceTecnicos.length === 0 ? (
              <p className="text-[12px] text-gray-muted text-center py-3">Sem técnicos ativos</p>
            ) : (() => {
              const lista = [...performanceTecnicos]
                .filter(t => (t as any).is_active !== false)
                .sort((a, b) => b.saldo - a.saldo);
              const maxSaldo = Math.max(...lista.map(t => Math.max(t.saldo, 0)), 1);
              return (
              <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
                {lista.map((t) => {
                    const pct = Math.min(Math.max((t.saldo / maxSaldo) * 100, 0), 100);
                    const isCrit = t.saldo < 50;
                    const isWarn = !isCrit && t.saldo < 150;
                    const barColor = isCrit ? '#EF4444' : isWarn ? '#D97706' : '#1B2E4B';
                    return (
                      <div key={t.id} onClick={() => setSelectedTecnicoSaldo(t as Profile)} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors hover:bg-gray-bg/60 cursor-pointer', isCrit && 'bg-red-50/60')}>
                        <div className="shrink-0 w-8 h-8 rounded-full bg-navy overflow-hidden flex items-center justify-center ring-2 ring-white shadow-sm">
                          {(t as any).avatar_url
                            ? <img src={(t as any).avatar_url} alt={t.full_name} className="w-full h-full object-cover object-center" />
                            : <span className="text-[10px] font-black text-white">{getInitials(t.full_name)}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-bold text-navy truncate">{t.full_name.split(' ')[0]}</span>
                            <span className={cn('text-[11px] font-black tabular-nums ml-2 shrink-0', isCrit ? 'text-error' : isWarn ? 'text-warning' : 'text-navy')}>
                              {eur(t.saldo)}
                            </span>
                          </div>
                          <div className="h-[4px] w-full rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                          </div>
                          <div className="flex items-center gap-2.5 mt-0.5">
                            <span className="flex items-center gap-0.5 text-[9px] text-slate-500 tabular-nums">
                              <ArrowDownCircle size={8} className="shrink-0" />
                              {eur(t.totalDep)}
                            </span>
                            <span className="flex items-center gap-0.5 text-[9px] text-[#D97706] tabular-nums">
                              <ArrowUpCircle size={8} className="shrink-0" />
                              {eur(t.custoDespesas)}
                            </span>
                          </div>
                        </div>
                        {isCrit && <AlertCircle size={12} className="text-error shrink-0" />}
                      </div>
                    );
                  })}
              </div>
              );
            })()}
          </div>

          {/* ── Obras em Curso ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-border/60 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-[14px] font-black text-navy">Obras em Curso</h2>
              {obrasInsight.length > 0 && (
                <span className="text-[10px] font-bold text-gray-400 tabular-nums">
                  {obrasInsight.length} ativa{obrasInsight.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="p-3 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-[60px] rounded-xl" />)}</div>
            ) : obrasInsight.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 py-8">
                <Building2 size={22} className="text-gray-300" />
                <p className="text-[12px] text-gray-muted">Sem obras ativas</p>
              </div>
            ) : (
              <div className="p-3 space-y-2 flex-1 min-h-0 overflow-y-auto">
                {obrasInsight.map((o) => {
                  const accent = o.budgetPct !== null
                    ? (o.budgetPct > 90 ? '#EF4444' : o.budgetPct > 70 ? '#D97706' : '#10B981')
                    : (o.prog >= 75 ? '#3D5AFE' : o.prog >= 40 ? '#10B981' : '#D97706');
                  return (
                    <div key={o.id} onClick={() => {
                      const full = obras.find(ob => ob.id === o.id) ?? null;
                      setSelectedObra(full);
                    }} className="rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors overflow-hidden cursor-pointer" style={{ borderLeftWidth: 3, borderLeftColor: accent }}>
                      {/* Linha 1: nome + progresso */}
                      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                        <p className="flex-1 text-[12px] font-bold text-navy truncate leading-tight">{o.nome}</p>
                        <span className="shrink-0 text-[11px] font-black tabular-nums" style={{ color: accent }}>{o.prog}%</span>
                      </div>

                      {/* Linha 2: cliente · localização · horas */}
                      <div className="flex items-center gap-2 px-3 pb-1 flex-wrap">
                        {o.cliente && <span className="text-[9px] text-gray-400 truncate max-w-[90px]">{o.cliente}</span>}
                        {o.localizacao && (
                          <>
                            {o.cliente && <span className="text-gray-300 text-[9px]">·</span>}
                            <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                              <MapPin size={7} className="shrink-0" />
                              <span className="truncate max-w-[80px]">{o.localizacao}</span>
                            </span>
                          </>
                        )}
                        {o.totalHoras > 0 && (
                          <>
                            <span className="text-gray-300 text-[9px]">·</span>
                            <span className="flex items-center gap-0.5 text-[9px] text-gray-400 tabular-nums">
                              <Clock size={7} className="shrink-0" />
                              {fmtH(o.totalHoras)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Linha 3: avatares + nomes dos técnicos + custo */}
                      {o.tecnicosAtivos.length > 0 && (
                        <div className="flex items-center gap-2 px-3 pb-2.5">
                          {/* Avatares empilhados */}
                          <div className="flex items-center shrink-0">
                            {o.tecnicosAtivos.slice(0, 4).map((t, i) => (
                              <div
                                key={t.id}
                                title={t.nome}
                                className="w-5 h-5 rounded-full bg-navy border-[1.5px] border-white flex items-center justify-center overflow-hidden"
                                style={{ marginLeft: i === 0 ? 0 : -5, zIndex: 10 - i }}
                              >
                                {t.avatar
                                  ? <img src={t.avatar} alt={t.nome} className="w-full h-full object-cover object-center" />
                                  : <span className="text-[6px] font-black text-white select-none">{getInitials(t.nome)}</span>
                                }
                              </div>
                            ))}
                            {o.tecnicosAtivos.length > 4 && (
                              <div className="w-5 h-5 rounded-full bg-gray-200 border-[1.5px] border-white flex items-center justify-center text-[6px] font-black text-gray-500 select-none" style={{ marginLeft: -5 }}>
                                +{o.tecnicosAtivos.length - 4}
                              </div>
                            )}
                          </div>
                          {/* Nomes */}
                          <p className="flex-1 text-[9px] font-semibold text-gray-500 truncate">
                            {o.tecnicosAtivos.map((t) => {
                              const parts = t.nome.trim().split(' ');
                              return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
                            }).join(' · ')}
                          </p>
                          {/* Custo */}
                          {o.custo > 0 && (
                            <span className="shrink-0 text-[9px] font-bold text-gray-400 tabular-nums">{eur(o.custo)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          </div>{/* fim grid Saldo+Obras */}

        </div>
      </div>

      {/* ── Modal Detalhe Apontamento ──────────────────────────────── */}
      <Dialog open={!!selectedApt} onOpenChange={o => !o && setSelectedApt(null)}>
        {selectedApt && (
          <ApontamentoDetalheModal
            apt={selectedApt}
            onClose={() => setSelectedApt(null)}
            onAprovar={handleAprovarApt}
            onRejeitar={handleRejeitarApt}
            busy={updateAptStatus.isPending}
          />
        )}
      </Dialog>

      {/* ── Modal Saldo Técnico ───────────────────────────────────── */}
      <Dialog open={!!selectedTecnicoSaldo} onOpenChange={o => !o && setSelectedTecnicoSaldo(null)}>
        {selectedTecnicoSaldo && (
          <SaldoTecnicoModal
            tecnico={selectedTecnicoSaldo}
            depositos={depositos}
            despesas={despesas}
            adminId={profile?.id ?? ''}
            onClose={() => setSelectedTecnicoSaldo(null)}
            onCreateDeposito={async (data) => {
              await createDeposito.mutateAsync(data);
            }}
            isSubmitting={createDeposito.isPending}
          />
        )}
      </Dialog>

      {/* ── Modal Detalhe Obra ─────────────────────────────────── */}
      <Dialog open={!!selectedObra} onOpenChange={o => !o && setSelectedObra(null)}>
        {selectedObra && (
          <ObrasDetalheModal
            obra={selectedObra}
            apontamentos={apontamentos}
            despesas={despesas}
            onClose={() => setSelectedObra(null)}
          />
        )}
      </Dialog>

      {/* ── Modal Detalhe Despesa ──────────────────────────────────── */}
      <Dialog open={!!selectedDesp} onOpenChange={o => !o && setSelectedDesp(null)}>
        {selectedDesp && (
          <DespesaDetalheModal
            desp={selectedDesp}
            onClose={() => setSelectedDesp(null)}
            onAprovar={handleAprovarDesp}
            onRejeitar={handleRejeitarDesp}
            busy={updateDespStatus.isPending}
          />
        )}
      </Dialog>

      {/* ── Dialog Rejeição Apontamento ────────────────────────────── */}
      <Dialog open={rejectDialogApt.open} onOpenChange={o => !o && setRejectDialogApt({ open: false, ids: [], nota: '' })}>
        <DialogContent className="max-w-md rounded-2xl p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-gray-border/60">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Confirmação</p>
              <DialogTitle className="text-navy font-black text-[16px] tracking-tight mt-0.5">
                Rejeitar {rejectDialogApt.ids.length > 1 ? `${rejectDialogApt.ids.length} Apontamentos` : 'Apontamento'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-5 py-4 space-y-3">
            <p className="text-[12px] text-gray-muted">Motivo da rejeição (opcional). O técnico poderá ver esta nota.</p>
            <textarea
              value={rejectDialogApt.nota}
              onChange={e => setRejectDialogApt(p => ({ ...p, nota: e.target.value }))}
              placeholder="Ex: Horário incorrecto, faltam detalhes..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-border bg-gray-bg text-[13px] text-gray-text placeholder:text-gray-muted/50 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/25 resize-none transition-all"
            />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setRejectDialogApt({ open: false, ids: [], nota: '' })} className="flex-1 h-10 rounded-xl border border-gray-border text-[13px] font-semibold text-gray-text hover:bg-gray-bg transition-colors">Cancelar</button>
              <button onClick={handleConfirmRejeitarApt} disabled={rejectPendingApt} className="flex-1 h-10 rounded-xl bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 transition-colors disabled:opacity-60">
                {rejectPendingApt ? 'A rejeitar...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Rejeição Despesa ────────────────────────────────── */}
      <Dialog open={rejectDialogDesp.open} onOpenChange={o => !o && setRejectDialogDesp({ open: false, ids: [], nota: '' })}>
        <DialogContent className="max-w-md rounded-2xl p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-gray-border/60">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Confirmação</p>
              <DialogTitle className="text-navy font-black text-[16px] tracking-tight mt-0.5">
                Rejeitar {rejectDialogDesp.ids.length > 1 ? `${rejectDialogDesp.ids.length} Despesas` : 'Despesa'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-5 py-4 space-y-3">
            <p className="text-[12px] text-gray-muted">Motivo da rejeição (opcional). O técnico poderá ver esta nota.</p>
            <textarea
              value={rejectDialogDesp.nota}
              onChange={e => setRejectDialogDesp(p => ({ ...p, nota: e.target.value }))}
              placeholder="Ex: Comprovativo em falta, valor incorreto..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-border bg-gray-bg text-[13px] text-gray-text placeholder:text-gray-muted/50 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/25 resize-none transition-all"
            />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setRejectDialogDesp({ open: false, ids: [], nota: '' })} className="flex-1 h-10 rounded-xl border border-gray-border text-[13px] font-semibold text-gray-text hover:bg-gray-bg transition-colors">Cancelar</button>
              <button onClick={handleConfirmRejeitarDesp} disabled={rejectPendingDesp} className="flex-1 h-10 rounded-xl bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 transition-colors disabled:opacity-60">
                {rejectPendingDesp ? 'A rejeitar...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
