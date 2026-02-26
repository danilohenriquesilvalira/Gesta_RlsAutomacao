'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  useDespesas, useUpdateDespesaStatus,
  useDepositos, useCreateDeposito,
} from '@/lib/queries/despesas';
import { useTecnicos } from '@/lib/queries/tecnicos';
import { useObras } from '@/lib/queries/obras';
import { DespesasTable } from '@/components/admin/DespesasTable';
import { DepositoModal } from '@/components/admin/DepositoModal';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Wallet, TrendingDown, ArrowUpCircle,
  X, ChevronLeft, ChevronRight, PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DespesaStatus, Profile } from '@/types';

const PAGE_SIZE = 20;

function eur(n: number) {
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}
function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/80 ${className}`} />;
}

export default function AdminDespesasPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'despesas' | 'saldo'>('despesas');
  const [page, setPage] = useState(1);

  // Deposito modal
  const [depositoOpen, setDepositoOpen] = useState(false);
  const [depositoTecnicoId, setDepositoTecnicoId] = useState<string | undefined>();

  // Filtros (tab despesas)
  const [filterTecnico, setFilterTecnico] = useState('');
  const [filterObra, setFilterObra] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: despesas = [], isLoading: lDesp } = useDespesas({
    tecnicoId: filterTecnico || undefined,
    obraId: filterObra || undefined,
    status: filterStatus ? (filterStatus as DespesaStatus) : undefined,
  });
  // Sem filtros — usado no saldo (para não depender dos filtros da tab Despesas)
  const { data: todasDespesas = [], isLoading: lTodas } = useDespesas();
  const { data: depositos = [], isLoading: lDep } = useDepositos();
  const { data: tecnicos = [] } = useTecnicos();
  const { data: obras = [] } = useObras();

  const updateStatus = useUpdateDespesaStatus();
  const createDeposito = useCreateDeposito();

  const tecnicosTecnico = tecnicos.filter((t) => t.role === 'tecnico') as Profile[];
  const hasFilters = !!(filterTecnico || filterObra || filterStatus);

  const handleFilter = (key: 'tecnico' | 'obra' | 'status', value: string) => {
    if (key === 'tecnico') setFilterTecnico(value);
    else if (key === 'obra') setFilterObra(value);
    else setFilterStatus(value);
    setPage(1);
  };
  const clearFilters = () => { setFilterTecnico(''); setFilterObra(''); setFilterStatus(''); setPage(1); };

  // ── Stats tab despesas ─────────────────────────────────────────────────────
  const despStats = useMemo(() => {
    const totalAprovado = despesas.filter((d) => d.status === 'aprovada').reduce((s, d) => s + Number(d.valor), 0);
    const pendentes = despesas.filter((d) => d.status === 'pendente').length;
    return { total: despesas.length, totalAprovado, pendentes };
  }, [despesas]);

  // ── Paginação ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(despesas.length / PAGE_SIZE));
  const paginated = despesas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, 6, 7];
    if (page >= totalPages - 3) return Array.from({ length: 7 }, (_, i) => totalPages - 6 + i);
    return Array.from({ length: 7 }, (_, i) => page - 3 + i);
  }, [page, totalPages]);

  // ── Saldo por técnico (usa todasDespesas — sem filtros) ─────────────────
  const tecnicosSaldo = useMemo(() =>
    tecnicosTecnico.map((tec) => {
      const deps = depositos.filter((d) => d.tecnico_id === tec.id);
      const desps = todasDespesas.filter((d) => d.tecnico_id === tec.id && d.status === 'aprovada');
      const totalDep = deps.reduce((s, d) => s + Number(d.valor), 0);
      const totalGasto = desps.reduce((s, d) => s + Number(d.valor), 0);
      return { tec, totalDep, totalGasto, saldo: totalDep - totalGasto };
    }).sort((a, b) => b.saldo - a.saldo),
    [tecnicosTecnico, depositos, todasDespesas]
  );

  const saldoGlobal = useMemo(() => {
    const totalDep = depositos.reduce((s, d) => s + Number(d.valor), 0);
    const totalGasto = todasDespesas.filter((d) => d.status === 'aprovada').reduce((s, d) => s + Number(d.valor), 0);
    return { totalDep, totalGasto, saldo: totalDep - totalGasto };
  }, [depositos, todasDespesas]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleAprovar(id: string) {
    try { await updateStatus.mutateAsync({ id, status: 'aprovada' }); toast.success('Despesa aprovada'); }
    catch { toast.error('Erro ao aprovar despesa'); }
  }
  async function handleRejeitar(id: string) {
    try { await updateStatus.mutateAsync({ id, status: 'rejeitada' }); toast.success('Despesa rejeitada'); }
    catch { toast.error('Erro ao rejeitar despesa'); }
  }
  async function handleCreateDeposito(data: {
    tecnico_id: string; valor: number; data_deposito: string; descricao?: string;
  }) {
    if (!profile) return;
    try {
      await createDeposito.mutateAsync({ ...data, admin_id: profile.id });
      toast.success('Depósito registado com sucesso!');
      setDepositoOpen(false);
      setDepositoTecnicoId(undefined);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registar depósito');
    }
  }
  const openDeposito = (tecnicoId?: string) => {
    setDepositoTecnicoId(tecnicoId);
    setDepositoOpen(true);
  };

  const isSaldoLoading = lTodas || lDep;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-3 lg:overflow-hidden">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Administração</p>
          <h1 className="text-xl font-black text-navy tracking-tight">Despesas</h1>
        </div>
        <button
          onClick={() => openDeposito()}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-navy text-white text-[12px] font-bold hover:bg-navy-light transition-colors shadow-sm shadow-navy/20"
        >
          <PlusCircle size={13} />
          Registar Depósito
        </button>
      </div>

      {/* ── Tab switcher ──────────────────────────────────────────────────── */}
      <div className="shrink-0 flex gap-1 bg-white border border-gray-border rounded-xl p-1 w-fit shadow-sm">
        {([
          { key: 'despesas', label: 'Despesas' },
          { key: 'saldo', label: 'Depósitos & Saldo' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'h-7 px-4 rounded-lg text-[12px] font-bold transition-all',
              activeTab === tab.key
                ? 'bg-navy text-white shadow-sm'
                : 'text-gray-muted hover:text-navy'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: DESPESAS ══════════════════════════════════════════════════ */}
      {activeTab === 'despesas' && (
        <>
          {/* Filtros */}
          <div className="shrink-0 bg-white rounded-xl border border-gray-border shadow-sm px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">

              <div className="flex-1 min-w-[130px] space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Funcionário</p>
                <Select value={filterTecnico || 'all'} onValueChange={(v) => handleFilter('tecnico', v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {tecnicosTecnico.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[130px] space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Obra</p>
                <Select value={filterObra || 'all'} onValueChange={(v) => handleFilter('obra', v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {obras.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.codigo} — {o.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[130px] space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Estado</p>
                <Select value={filterStatus || 'all'} onValueChange={(v) => handleFilter('status', v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovada">Aprovada</SelectItem>
                    <SelectItem value="rejeitada">Rejeitada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 h-9 px-3 self-end rounded-lg border border-gray-border text-[12px] font-semibold text-gray-muted hover:text-error hover:border-error/30 hover:bg-red-50 transition-colors"
                >
                  <X size={12} /> Limpar
                </button>
              )}
            </div>
          </div>

          {/* Tabela card */}
          <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">

            {/* Info bar */}
            <div className="shrink-0 px-4 py-2 border-b border-gray-border/60 flex items-center justify-between bg-gray-bg/30">
              <p className="text-[11px] text-gray-muted">
                {lDesp ? <span>A carregar...</span> : (
                  <>
                    <span className="font-black text-navy">{despStats.total}</span>{' '}despesas
                    {hasFilters && <span className="text-accent-blue font-semibold"> · filtrado</span>}
                    {despStats.pendentes > 0 && <span className="text-warning font-semibold"> · {despStats.pendentes} pendentes</span>}
                  </>
                )}
              </p>
              {!lDesp && despesas.length > 0 && (
                <p className="text-[11px] text-gray-muted">
                  Pág. <span className="font-black text-navy">{page}</span> de{' '}
                  <span className="font-black text-navy">{totalPages}</span> · {PAGE_SIZE} por página
                </p>
              )}
            </div>

            {/* Tabela scrollável */}
            <div className="flex-1 overflow-auto">
              <DespesasTable
                despesas={paginated}
                onAprovar={handleAprovar}
                onRejeitar={handleRejeitar}
                isLoading={lDesp}
              />
            </div>

            {/* Paginação */}
            {!lDesp && totalPages > 1 && (
              <div className="shrink-0 border-t border-gray-border/60 px-4 py-2.5 flex items-center justify-between bg-gray-bg/20">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-border text-[12px] font-semibold text-gray-muted hover:bg-white hover:text-navy disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={13} /> Anterior
                </button>
                <div className="flex items-center gap-1">
                  {pageNumbers.map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={cn(
                        'w-7 h-7 rounded-lg text-[12px] font-bold transition-colors',
                        page === n ? 'bg-navy text-white shadow-sm' : 'text-gray-muted hover:bg-white hover:text-navy'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-border text-[12px] font-semibold text-gray-muted hover:bg-white hover:text-navy disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                >
                  Seguinte <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ TAB: DEPÓSITOS & SALDO ════════════════════════════════════════ */}
      {activeTab === 'saldo' && (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">

          {/* KPIs globais */}
          <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              {
                label: 'Total Depositado',
                value: isSaldoLoading ? '—' : eur(saldoGlobal.totalDep),
                icon: <ArrowUpCircle size={13} />,
                accent: 'bg-success', iconBg: 'bg-emerald-50 text-success',
                cls: 'text-navy',
              },
              {
                label: 'Total Gasto (Aprovado)',
                value: isSaldoLoading ? '—' : eur(saldoGlobal.totalGasto),
                icon: <TrendingDown size={13} />,
                accent: 'bg-error', iconBg: 'bg-red-50 text-error',
                cls: 'text-navy',
              },
              {
                label: 'Saldo Global',
                value: isSaldoLoading ? '—' : (saldoGlobal.saldo >= 0 ? '+' : '') + eur(saldoGlobal.saldo),
                icon: <Wallet size={13} />,
                accent: !isSaldoLoading && saldoGlobal.saldo < 0 ? 'bg-error' : 'bg-success',
                iconBg: !isSaldoLoading && saldoGlobal.saldo < 0 ? 'bg-red-50 text-error' : 'bg-emerald-50 text-success',
                cls: !isSaldoLoading && saldoGlobal.saldo < 0 ? 'text-error' : 'text-success',
              },
            ]).map((k, i) => (
              <div key={i} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${k.accent}`} />
                <div className="pl-4 pr-3 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted">{k.label}</p>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${k.iconBg}`}>{k.icon}</div>
                  </div>
                  <p className={`text-[15px] font-black leading-none tabular-nums ${k.cls}`}>{k.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Cards por técnico */}
          {isSaldoLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gray-200" />
                  <div className="pl-5 pr-4 pt-4 pb-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <Sk className="h-9 w-9 rounded-full shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Sk className="h-3.5 w-28" />
                        <Sk className="h-2.5 w-16" />
                      </div>
                    </div>
                    <div className="border-t border-gray-border/70 pt-2.5 grid grid-cols-3 gap-2">
                      {[0, 1, 2].map((j) => (
                        <div key={j} className="space-y-1 text-center">
                          <Sk className="h-2.5 w-14 mx-auto" />
                          <Sk className="h-4 w-16 mx-auto" />
                        </div>
                      ))}
                    </div>
                    <Sk className="h-1.5 w-full rounded-full" />
                    <Sk className="h-8 w-full rounded-lg border-t border-gray-border/70 mt-3 pt-2.5" />
                  </div>
                </div>
              ))}
            </div>
          ) : tecnicosSaldo.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Wallet size={22} className="text-gray-muted/50" />
              </div>
              <p className="text-sm font-bold text-navy">Sem dados de saldo</p>
              <p className="text-[12px] text-gray-muted mt-1">Registe depósitos para os funcionários</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {tecnicosSaldo.map(({ tec, totalDep, totalGasto, saldo }) => {
                const pctGasto = totalDep > 0 ? Math.min((totalGasto / totalDep) * 100, 100) : 0;
                const barColor = saldo > 0 ? 'bg-success' : saldo < 0 ? 'bg-error' : 'bg-gray-300';
                const progColor = pctGasto >= 90 ? '#ef4444' : pctGasto >= 70 ? '#f59e0b' : '#10b981';

                return (
                  <div key={tec.id} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', barColor)} />
                    <div className="pl-5 pr-4 pt-4 pb-3">

                      {/* Avatar + nome */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-navy/10 ring-offset-1 ring-offset-white">
                          {tec.avatar_url
                            ? <img src={tec.avatar_url} alt={tec.full_name} className="w-full h-full object-cover object-center" />
                            : <span className="text-[10px] font-black text-white">{getInitials(tec.full_name)}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-navy leading-tight truncate">{tec.full_name}</p>
                          <p className="text-[10px] text-gray-muted">{tec.role === 'admin' ? 'Administrador' : 'Funcionário'}</p>
                        </div>
                        {/* Badge saldo */}
                        <span className={cn(
                          'ml-auto shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-black',
                          saldo > 0 ? 'bg-success/10 border-success/25 text-success'
                            : saldo < 0 ? 'bg-error/10 border-error/20 text-error'
                              : 'bg-gray-100 border-gray-200 text-gray-400'
                        )}>
                          {saldo > 0 ? 'Saldo +' : saldo < 0 ? 'Saldo −' : 'Zerado'}
                        </span>
                      </div>

                      {/* Stats: 3 colunas */}
                      <div className="border-t border-gray-border/70 pt-2.5 pb-2 grid grid-cols-3 divide-x divide-gray-border/60 text-center">
                        <div className="pr-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Depositado</p>
                          <p className="text-[12px] font-black text-success tabular-nums leading-tight">{eur(totalDep)}</p>
                        </div>
                        <div className="px-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Gasto</p>
                          <p className="text-[12px] font-black text-error tabular-nums leading-tight">{eur(totalGasto)}</p>
                        </div>
                        <div className="pl-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Saldo</p>
                          <p className={cn(
                            'text-[12px] font-black tabular-nums leading-tight',
                            saldo >= 0 ? 'text-success' : 'text-error'
                          )}>
                            {saldo >= 0 ? '+' : ''}{eur(saldo)}
                          </p>
                        </div>
                      </div>

                      {/* Barra de utilização */}
                      {totalDep > 0 && (
                        <div className="mt-2 mb-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[9px] text-gray-muted font-semibold">Utilização do fundo</p>
                            <p className={cn(
                              'text-[9px] font-black',
                              pctGasto >= 90 ? 'text-error' : pctGasto >= 70 ? 'text-warning' : 'text-gray-muted'
                            )}>
                              {Math.round(pctGasto)}%
                            </p>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(pctGasto, 100)}%`, backgroundColor: progColor }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Acção */}
                      <div className="border-t border-gray-border/70 mt-3 pt-2.5">
                        <button
                          onClick={() => openDeposito(tec.id)}
                          className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-navy/5 border border-navy/10 text-[12px] font-semibold text-navy hover:bg-navy hover:text-white hover:border-transparent transition-all"
                        >
                          <PlusCircle size={12} />
                          Registar Depósito
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal Depósito ────────────────────────────────────────────────── */}
      <DepositoModal
        key={depositoTecnicoId ?? 'global'}
        open={depositoOpen}
        onClose={() => { setDepositoOpen(false); setDepositoTecnicoId(undefined); }}
        tecnicos={tecnicosTecnico}
        onSubmit={handleCreateDeposito}
        isSubmitting={createDeposito.isPending}
        defaultTecnicoId={depositoTecnicoId}
      />
    </div>
  );
}
