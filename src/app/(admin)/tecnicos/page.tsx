'use client';

import { useState, useMemo } from 'react';
import { useTecnicosComHoras, useToggleTecnicoAtivo } from '@/lib/queries/tecnicos';
import { useApontamentos, useUpdateApontamentoStatus } from '@/lib/queries/apontamentos';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { EditTecnicoModal } from '@/components/admin/EditTecnicoModal';
import { ApontamentosTable } from '@/components/admin/ApontamentosTable';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Users, Clock, UserPlus, Pencil, ClipboardList, Building2, Power,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TecnicoRow } from '@/components/admin/TecnicosTable';

const MAX_HORAS_MES = 176; // ~22 dias × 8h

function fmtH(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/80 ${className}`} />;
}

export default function TecnicosPage() {
  const { data: tecnicos = [], isLoading } = useTecnicosComHoras();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTec, setEditingTec] = useState<TecnicoRow | null>(null);

  const { data: tecApts = [], isLoading: lApts } = useApontamentos(
    selectedId ? { tecnicoId: selectedId } : undefined
  );
  const updateStatus = useUpdateApontamentoStatus();
  const toggleAtivo = useToggleTecnicoAtivo();

  const selectedProfile = tecnicos.find((t) => t.id === selectedId);

  const stats = useMemo(() => {
    const totalHoras = tecnicos.reduce((s, t) => s + t.totalHoras, 0);
    const ativos = tecnicos.filter((t) => t.is_active).length;
    return { total: tecnicos.length, totalHoras, ativos };
  }, [tecnicos]);

  return (
    <div className="h-full flex flex-col gap-3 lg:overflow-hidden">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-muted">Administração</p>
          <h1 className="text-xl font-black text-navy tracking-tight">Técnicos</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Chips */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
              <Users size={11} className="text-accent-blue shrink-0" />
              {isLoading ? '—' : stats.total} técnicos
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-border text-[11px] font-bold text-navy shadow-sm">
              <Clock size={11} className="text-success shrink-0" />
              {isLoading ? '—' : fmtH(stats.totalHoras)} este mês
            </div>
          </div>
          {/* Botão novo */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-navy text-white text-[12px] font-bold hover:bg-navy-light transition-colors shadow-sm shadow-navy/20"
          >
            <UserPlus size={13} />
            Novo Técnico
          </button>
        </div>
      </div>

      {/* ── Grid de cards ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          /* Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gray-200/80" />
                <div className="pl-5 pr-4 pt-4 pb-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Sk className="h-11 w-11 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Sk className="h-3.5 w-32" />
                      <Sk className="h-3 w-20" />
                    </div>
                    <Sk className="h-5 w-12 rounded-full shrink-0" />
                  </div>
                  <div className="border-t border-gray-border/70 pt-2.5 grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="space-y-1 text-center">
                        <Sk className="h-2.5 w-10 mx-auto" />
                        <Sk className="h-4 w-12 mx-auto" />
                      </div>
                    ))}
                  </div>
                  <Sk className="h-1.5 w-full rounded-full" />
                  <div className="flex gap-2 border-t border-gray-border/70 pt-2.5">
                    <Sk className="h-8 flex-1 rounded-lg" />
                    <Sk className="h-8 w-8 rounded-lg shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tecnicos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Users size={22} className="text-gray-muted/50" />
            </div>
            <p className="text-sm font-bold text-navy">Sem técnicos registados</p>
            <p className="text-[12px] text-gray-muted mt-1">Crie o primeiro técnico com o botão acima</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {tecnicos.map((tec) => {
              const pct = Math.min((tec.totalHoras / MAX_HORAS_MES) * 100, 100);
              const isOvertime = tec.totalHoras > MAX_HORAS_MES;
              const isActive = tec.is_active; // estado real da BD
              const hasHours = tec.totalHoras > 0;
              const barColor = !isActive ? 'bg-gray-300' : isOvertime ? 'bg-warning' : hasHours ? 'bg-success' : 'bg-accent-blue/40';
              const progColor = !isActive ? '#e2e8f0' : isOvertime ? '#f59e0b' : hasHours ? '#10b981' : '#93c5fd';

              return (
                <div
                  key={tec.id}
                  className={cn(
                    'relative bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow',
                    isActive ? 'border-gray-border' : 'border-gray-border/50 opacity-75'
                  )}
                >
                  <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', barColor)} />
                  <div className="pl-5 pr-4 pt-4 pb-3">

                    {/* ── Header: avatar + nome + badge ── */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-11 w-11 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-navy/10 ring-offset-1 ring-offset-white">
                        {tec.avatar_url
                          ? <img src={tec.avatar_url} alt={tec.full_name} className="w-full h-full object-cover object-center" />
                          : <span className="text-[11px] font-black text-white">{getInitials(tec.full_name)}</span>
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-navy leading-tight truncate">{tec.full_name}</p>
                        {tec.obraAtual ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Building2 size={9} className="text-accent-blue shrink-0" />
                            <p className="text-[11px] text-accent-blue font-semibold truncate">{tec.obraAtual}</p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-muted/60 mt-0.5 italic">Sem obra activa</p>
                        )}
                      </div>
                      <span className={cn(
                        'shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide',
                        isActive
                          ? 'bg-success/10 border-success/25 text-success'
                          : 'bg-error/10 border-error/20 text-error'
                      )}>
                        {isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    {/* ── Horas: 3 colunas ── */}
                    <div className="border-t border-gray-border/70 pt-2.5 pb-2 grid grid-cols-3 divide-x divide-gray-border/60 text-center">
                      <div className="pr-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Normal</p>
                        <p className="text-[14px] font-black text-navy tabular-nums leading-tight">{fmtH(tec.horasNormais)}</p>
                      </div>
                      <div className="px-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Extra</p>
                        <p className={cn(
                          'text-[14px] font-black tabular-nums leading-tight',
                          tec.horasExtras > 0 ? 'text-warning' : 'text-gray-300'
                        )}>
                          {fmtH(tec.horasExtras)}
                        </p>
                      </div>
                      <div className="pl-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-muted mb-0.5">Total</p>
                        <p className={cn(
                          'text-[14px] font-black tabular-nums leading-tight',
                          isOvertime ? 'text-warning' : 'text-navy'
                        )}>
                          {fmtH(tec.totalHoras)}
                        </p>
                      </div>
                    </div>

                    {/* ── Barra de progresso mensal ── */}
                    <div className="mt-2 mb-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] text-gray-muted font-semibold">Ocupação mensal</p>
                        <p className={cn('text-[9px] font-black', isOvertime ? 'text-warning' : 'text-gray-muted')}>
                          {Math.round(pct)}%{isOvertime && ' ⚠'}
                        </p>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: progColor }}
                        />
                      </div>
                    </div>

                    {/* ── Acções ── */}
                    <div className="border-t border-gray-border/70 mt-3 pt-2.5 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedId(tec.id)}
                        disabled={!isActive}
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-navy/5 border border-navy/10 text-[12px] font-semibold text-navy hover:bg-navy hover:text-white hover:border-transparent transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-navy/5 disabled:hover:text-navy disabled:hover:border-navy/10"
                      >
                        <ClipboardList size={12} />
                        Apontamentos
                      </button>
                      <button
                        onClick={() => setEditingTec(tec)}
                        title="Editar técnico"
                        className="h-8 w-8 rounded-lg bg-gray-100 text-gray-muted hover:bg-gray-200 hover:text-navy transition-colors flex items-center justify-center shrink-0"
                      >
                        <Pencil size={13} />
                      </button>
                      {/* Toggle ativo/inativo */}
                      <button
                        onClick={() => toggleAtivo.mutate({ id: tec.id, is_active: !tec.is_active })}
                        disabled={toggleAtivo.isPending}
                        title={isActive ? 'Desactivar técnico' : 'Activar técnico'}
                        className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-50',
                          isActive
                            ? 'bg-error/10 text-error hover:bg-error hover:text-white'
                            : 'bg-success/10 text-success hover:bg-success hover:text-white'
                        )}
                      >
                        <Power size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modais ────────────────────────────────────────────────────────── */}
      <CreateUserModal open={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <EditTecnicoModal open={!!editingTec} tecnico={editingTec} onClose={() => setEditingTec(null)} />

      {/* Dialog apontamentos do técnico */}
      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-gray-border shadow-xl">
          <DialogHeader className="px-5 py-4 border-b border-gray-border/60 shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Técnico</p>
              <DialogTitle className="text-navy font-black text-[16px] tracking-tight mt-0.5">
                {selectedProfile?.full_name ?? '—'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <ApontamentosTable
              apontamentos={tecApts}
              onAprovar={(id) => updateStatus.mutate({ id, status: 'aprovado' })}
              onRejeitar={(id) => updateStatus.mutate({ id, status: 'rejeitado' })}
              showActions
              isLoading={lApts}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
