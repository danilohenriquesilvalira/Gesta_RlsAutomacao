import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  X, ArrowDownCircle, ArrowUpCircle, AlertCircle, PlusCircle,
  Check, CalendarDays, Receipt, Wallet, Search, ChevronDown,
} from 'lucide-react';
import { DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Profile, Deposito, Despesa } from '@/types';

/* ── helpers ──────────────────────────────────────────────────────────── */
function eur(n: number) {
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}
function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

/* ── Deposit form schema ──────────────────────────────────────────────── */
const schema = z.object({
  valor: z.coerce
    .number({ invalid_type_error: 'Introduza um valor válido' })
    .positive('O valor deve ser positivo'),
  data_deposito: z.string().min(1, 'Informe a data'),
  descricao: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const sInput    = 'block w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-navy placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30 transition';
const sInputErr = 'block w-full h-10 px-3 rounded-xl border border-red-300 bg-red-50 text-sm text-navy placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 transition';

/* ── Component ────────────────────────────────────────────────────────── */
export function SaldoTecnicoModal({
  tecnico,
  depositos,
  despesas,
  adminId,
  onClose,
  onCreateDeposito,
  isSubmitting,
}: {
  tecnico: Profile;
  depositos: Deposito[];
  despesas: Despesa[];
  adminId: string;
  onClose: () => void;
  onCreateDeposito: (data: {
    tecnico_id: string;
    admin_id: string;
    valor: number;
    descricao?: string;
    data_deposito: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dropdownOpen]);

  // ── Month filter (default = current month) ──────────────────────────────
  const [filtroMes, setFiltroMes] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const meses = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based
    const list: { value: string; label: string; sublabel: string }[] = [
      { value: '', label: 'Todos os registos', sublabel: 'Ano ' + currentYear },
    ];
    for (let m = currentMonth; m >= 0; m--) {
      const d = new Date(currentYear, m, 1);
      const value = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-PT', { month: 'long' });
      const sublabel = m === currentMonth ? 'Mês atual' : m === currentMonth - 1 ? 'Mês passado' : '';
      list.push({ value, label, sublabel });
    }
    return list;
  }, []);

  const activeMesLabel = useMemo(() => {
    if (!filtroMes) return 'Todos';
    const found = meses.find((m) => m.value === filtroMes);
    return found?.label ?? filtroMes;
  }, [filtroMes, meses]);

  const currentYear = new Date().getFullYear();

  const today = new Date().toISOString().split('T')[0];
  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { data_deposito: today },
  });

  // ── Derived stats (ALL TIME — para o cabeçalho) ────────────────────────
  const tecDeps  = depositos.filter((d) => d.tecnico_id === tecnico.id);
  const tecDesps = despesas.filter((d) => d.tecnico_id === tecnico.id && d.status === 'aprovada');
  const totalDep   = tecDeps.reduce((s, d) => s + Number(d.valor), 0);
  const totalGasto = tecDesps.reduce((s, d) => s + Number(d.valor), 0);
  const saldo = totalDep - totalGasto;
  const isCrit = saldo < 50;
  const isWarn = !isCrit && saldo < 150;
  const saldoColor = isCrit ? '#EF4444' : isWarn ? '#D97706' : '#1B2E4B';

  // ── Filtered lists ───────────────────────────────────────────────────────
  const filteredDeps = useMemo(() => {
    const sorted = [...tecDeps].sort((a, b) => b.data_deposito.localeCompare(a.data_deposito));
    if (!filtroMes) return sorted;
    return sorted.filter((d) => d.data_deposito.startsWith(filtroMes));
  }, [tecDeps, filtroMes]);

  const allDesps = useMemo(() =>
    [...despesas.filter((d) => d.tecnico_id === tecnico.id)]
      .sort((a, b) => b.data_despesa.localeCompare(a.data_despesa)),
  [despesas, tecnico.id]);

  const filteredDesps = useMemo(() => {
    if (!filtroMes) return allDesps;
    return allDesps.filter((d) => d.data_despesa.startsWith(filtroMes));
  }, [allDesps, filtroMes]);

  async function onSubmit(data: FormData) {
    try {
      await onCreateDeposito({
        tecnico_id: tecnico.id,
        admin_id: adminId,
        valor: data.valor,
        descricao: data.descricao || undefined,
        data_deposito: data.data_deposito,
      });
      toast.success(`Depósito de ${eur(data.valor)} registado para ${tecnico.full_name.split(' ')[0]}!`);
      reset({ data_deposito: today });
      setShowForm(false);
    } catch {
      toast.error('Erro ao registar depósito');
    }
  }

  const TIPO_DOT: Record<string, string> = {
    combustível: '#eab308', alimentação: '#f97316', alojamento: '#8b5cf6',
    material: '#14b8a6', transporte: '#3D5AFE', outro: '#94a3b8',
  };
  const DSP_STATUS: Record<string, { label: string; cls: string }> = {
    pendente:  { label: 'Pendente',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    aprovada:  { label: 'Aprovada',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    rejeitada: { label: 'Rejeitada', cls: 'bg-red-50 text-red-600 border-red-200' },
  };

  return (
    <DialogContent
      showCloseButton={false}
      className="w-[calc(100%-2rem)] max-w-lg p-0 gap-0 flex flex-col overflow-hidden rounded-2xl border border-gray-100 shadow-2xl"
      style={{ height: 'min(90vh, 680px)' }}
    >
      <DialogTitle className="sr-only">Saldo de {tecnico.full_name}</DialogTitle>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Saldo do Técnico</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-navy transition-colors"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Técnico + saldo */}
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-12 h-12 rounded-full bg-navy overflow-hidden flex items-center justify-center ring-2 ring-gray-100 shadow-sm">
            {tecnico.avatar_url
              ? <img src={tecnico.avatar_url} alt={tecnico.full_name} className="w-full h-full object-cover" />
              : <span className="text-[12px] font-black text-white">{getInitials(tecnico.full_name)}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-black text-navy leading-tight truncate">{tecnico.full_name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <ArrowDownCircle size={10} className="text-emerald-500" />
                Depósitos: <span className="font-bold text-navy tabular-nums ml-0.5">{eur(totalDep)}</span>
              </span>
              <span className="text-gray-200">·</span>
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <ArrowUpCircle size={10} className="text-amber-500" />
                Despesas: <span className="font-bold text-amber-600 tabular-nums ml-0.5">{eur(totalGasto)}</span>
              </span>
            </div>
          </div>
          {/* Saldo badge */}
          <div className="shrink-0 text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Saldo</p>
            <p className="text-[22px] font-black tabular-nums leading-none font-mono" style={{ color: saldoColor }}>
              {eur(saldo)}
            </p>
            {isCrit && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-red-500 mt-0.5">
                <AlertCircle size={9} /> Crítico
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto modal-scroll px-5 py-4 space-y-4">

        {/* ── Linha: Adicionar Depósito + Filtro de Mês ──────────── */}
        <div className="flex items-stretch gap-2">

          {/* Deposit form toggle */}
          <div className={cn(
            'flex-1 rounded-2xl border overflow-hidden transition-all duration-200',
            showForm ? 'border-navy/25 bg-navy/4' : 'border-dashed border-gray-200 bg-gray-50/50'
          )}>
            {/* Toggle button */}
            <button
              type="button"
              onClick={() => { setShowForm((v) => !v); if (showForm) reset({ data_deposito: today }); }}
              className={cn(
                'w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors',
                showForm ? 'text-navy' : 'text-gray-500 hover:text-navy'
              )}
            >
            <div className={cn(
              'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors',
              showForm ? 'bg-navy text-white' : 'bg-gray-100 text-gray-400'
            )}>
              {showForm ? <X size={13} /> : <PlusCircle size={13} />}
            </div>
            <div>
              <p className="text-[12px] font-black leading-tight">
                {showForm ? 'Cancelar depósito' : 'Adicionar Depósito'}
              </p>
              {!showForm && (
                <p className="text-[10px] text-gray-400">Registar um novo depósito/adiantamento</p>
              )}
            </div>
          </button>

            {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit(onSubmit)} className="px-4 pb-4 space-y-3 border-t border-navy/10">
              <div className="grid grid-cols-2 gap-3 pt-3">
                {/* Valor */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Valor (€)</p>
                  <input
                    type="number" step="0.01" min="0.01" placeholder="0,00"
                    {...register('valor')}
                    className={errors.valor ? sInputErr : sInput}
                  />
                  {errors.valor && <p className="text-[10px] text-red-500 font-medium mt-0.5">{errors.valor.message}</p>}
                </div>
                {/* Data */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Data</p>
                  <input
                    type="date"
                    {...register('data_deposito')}
                    className={errors.data_deposito ? sInputErr : sInput}
                  />
                  {errors.data_deposito && <p className="text-[10px] text-red-500 font-medium mt-0.5">{errors.data_deposito.message}</p>}
                </div>
              </div>
              {/* Descrição */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Descrição (opcional)</p>
                <input
                  type="text"
                  placeholder="Ex: Adiantamento de Março…"
                  {...register('descricao')}
                  className={sInput}
                />
              </div>
              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-navy text-white text-[13px] font-bold hover:bg-navy/90 transition-colors disabled:opacity-60 shadow-sm shadow-navy/20"
              >
                {isSubmitting ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : <Check size={14} />}
                {isSubmitting ? 'A guardar…' : 'Confirmar Depósito'}
              </button>
            </form>
            )}
          </div>

          {/* ── Filter lupa button ───────────────────────── */}
          <div ref={dropdownRef} className="relative shrink-0 self-start">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-14 h-[52px] rounded-2xl border text-[9px] font-bold transition-all',
                dropdownOpen
                  ? 'bg-navy text-white border-navy shadow-md shadow-navy/20'
                  : 'bg-gray-50 text-gray-500 border-dashed border-gray-200 hover:border-navy/40 hover:text-navy hover:bg-white'
              )}
            >
              <Search size={14} className="shrink-0" />
              <span className="leading-none uppercase tracking-wide">{filtroMes ? activeMesLabel.slice(0, 3) : 'Todos'}</span>
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-2xl border border-gray-100 bg-white shadow-xl shadow-black/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-50 flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Mês — {currentYear}</p>
                  <ChevronDown size={10} className="text-gray-300" />
                </div>
                <div className="overflow-y-auto max-h-52 py-1">
                  {meses.map(({ value, label, sublabel }) => {
                    const isActive = filtroMes === value;
                    return (
                      <button
                        key={value || '__all__'}
                        type="button"
                        onClick={() => { setFiltroMes(value); setDropdownOpen(false); }}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors',
                          isActive ? 'bg-navy/5' : 'hover:bg-gray-50'
                        )}
                      >
                        <div className="min-w-0">
                          <p className={cn(
                            'text-[12px] font-bold capitalize leading-tight',
                            isActive ? 'text-navy' : 'text-gray-800'
                          )}>{label}</p>
                          {sublabel && (
                            <p className="text-[10px] text-gray-400 leading-tight">{sublabel}</p>
                          )}
                        </div>
                        {isActive && <Check size={12} className="shrink-0 text-navy" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Histórico de depósitos ──────────────────────────── */}
        {filteredDeps.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownCircle size={12} className="text-emerald-500 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Depósitos ({filteredDeps.length})
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {filteredDeps.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-black text-emerald-700 tabular-nums leading-tight">
                      {new Date(d.data_deposito + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit' })}
                    </span>
                    <span className="text-[8px] font-semibold text-emerald-500 uppercase leading-tight">
                      {new Date(d.data_deposito + 'T00:00:00').toLocaleDateString('pt-PT', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-navy truncate leading-tight">
                      {d.descricao || 'Depósito'}
                    </p>
                    <p className="text-[10px] text-gray-400">{fmtDate(d.data_deposito)}</p>
                  </div>
                  <span className="shrink-0 text-[13px] font-black text-emerald-600 tabular-nums">
                    +{eur(Number(d.valor))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : tecDeps.length > 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-6 rounded-2xl border border-dashed border-gray-100">
            <ArrowDownCircle size={20} className="text-gray-200" />
            <p className="text-[11px] font-semibold text-gray-400">Sem depósitos neste mês</p>
          </div>
        ) : null}

        {/* ── Despesas ────────────────────────────────────────── */}
        {filteredDesps.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Receipt size={12} className="text-gray-400 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Despesas ({filteredDesps.length})
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {filteredDesps.map((d) => {
                const st = DSP_STATUS[d.status] ?? DSP_STATUS['pendente'];
                return (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center">
                      <span className="text-[11px] font-black text-navy tabular-nums leading-tight">
                        {new Date(d.data_despesa + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit' })}
                      </span>
                      <span className="text-[8px] font-semibold text-gray-400 uppercase leading-tight">
                        {new Date(d.data_despesa + 'T00:00:00').toLocaleDateString('pt-PT', { month: 'short' })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: TIPO_DOT[d.tipo_despesa] ?? '#94a3b8' }} />
                        <p className="text-[12px] font-bold text-navy capitalize truncate leading-tight">{d.tipo_despesa}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate leading-tight pl-3.5">
                        {d.obra?.nome || d.descricao || 'Sem obra'}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      <span className="text-[12px] font-black text-navy tabular-nums">
                        {eur(Number(d.valor))}
                      </span>
                      <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-bold', st.cls)}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : allDesps.length > 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-6 rounded-2xl border border-dashed border-gray-100">
            <Receipt size={20} className="text-gray-200" />
            <p className="text-[11px] font-semibold text-gray-400">Sem despesas neste mês</p>
          </div>
        ) : null}

        {tecDeps.length === 0 && allDesps.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <Wallet size={28} className="text-gray-200" />
            <p className="text-[13px] font-semibold text-gray-400">Sem registos financeiros</p>
          </div>
        )}
      </div>
    </DialogContent>
  );
}
