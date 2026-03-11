'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { EntryCard } from '@/components/tecnico/EntryCard';
import { ApontarModal } from '@/components/shared/ApontarModal';
import { EditarApontamentoModal } from '@/components/tecnico/EditarApontamentoModal';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  useApontamentos,
  useCreateApontamento,
  useUpdateApontamento,
  useDeleteApontamento,
} from '@/lib/queries/apontamentos';
import { useObras } from '@/lib/queries/obras';
import { saveOfflineApontamento } from '@/lib/offline/indexeddb';
import type { Apontamento, ApontamentoStatus, TipoHora } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

const MES = new Date().toLocaleDateString('pt-PT', { month: 'long' });
const MES_KEY = new Date().toISOString().slice(0, 7);

function parseDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return {
    weekday: dt.toLocaleDateString('pt-PT', { weekday: 'long' }),
    day:     dt.toLocaleDateString('pt-PT', { day: '2-digit' }),
    month:   dt.toLocaleDateString('pt-PT', { month: 'long' }),
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InicioPage() {
  const { profile }  = useAuth();
  const { isOnline, refreshCount } = useOfflineSync();

  const [modalOpen,     setModalOpen]     = useState(false);
  const [editingApt,    setEditingApt]    = useState<Apontamento | null>(null);
  const [deletingAptId, setDeletingAptId] = useState<string | null>(null);

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<ApontamentoStatus | ''>('');
  const [filterObra,   setFilterObra]   = useState('');

  const { data: apontamentos = [], isLoading } = useApontamentos(
    profile ? { tecnicoId: profile.id } : undefined
  );
  const { data: obras = [] } = useObras('ativa');

  const createApt = useCreateApontamento();
  const updateApt = useUpdateApontamento();
  const deleteApt = useDeleteApontamento();

  /* stats */
  const horasMes  = useMemo(() => apontamentos.filter(a => a.data_apontamento.startsWith(MES_KEY)).reduce((s, a) => s + (a.total_horas ?? 0), 0), [apontamentos]);
  const pendentes = useMemo(() => apontamentos.filter(a => a.status === 'pendente').length, [apontamentos]);
  const blockedDates = useMemo(() => apontamentos.map(a => a.data_apontamento), [apontamentos]);

  /* obras únicas do histórico */
  const obrasHist = useMemo(() => {
    const m = new Map<string, { id: string; codigo: string; nome: string }>();
    apontamentos.forEach(a => { if (a.obra_id && a.obra) m.set(a.obra_id, { id: a.obra_id, codigo: a.obra.codigo, nome: a.obra.nome }); });
    return Array.from(m.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [apontamentos]);

  /* filtragem */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return apontamentos.filter(a => {
      if (q && !a.obra?.nome?.toLowerCase().includes(q) && !a.obra?.codigo?.toLowerCase().includes(q) && !a.tipo_servico?.toLowerCase().includes(q)) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterObra && a.obra_id !== filterObra) return false;
      return true;
    });
  }, [apontamentos, search, filterStatus, filterObra]);

  const grouped = useMemo(() => filtered.reduce<Record<string, typeof filtered>>((acc, a) => {
    if (!acc[a.data_apontamento]) acc[a.data_apontamento] = [];
    acc[a.data_apontamento].push(a);
    return acc;
  }, {}), [filtered]);

  const hasFilter = !!(search || filterStatus || filterObra);
  const clear = () => { setSearch(''); setFilterStatus(''); setFilterObra(''); };

  /* handlers */
  async function handleApontar(data: { obra_id: string | null; data_apontamento: string; tipo_servico: string; tipo_hora: TipoHora; hora_entrada: string; hora_saida: string; total_horas: number; descricao?: string; fotos_base64: string[]; }) {
    if (!profile) return;
    try {
      if (isOnline) { await createApt.mutateAsync({ tecnico_id: profile.id, ...data }); }
      else { await saveOfflineApontamento({ local_id: crypto.randomUUID(), tecnico_id: profile.id, ...data, created_at: new Date().toISOString() }); await refreshCount(); }
      setModalOpen(false);
    } catch { toast.error('Erro ao guardar o registo.'); }
  }
  async function handleEdit(data: { obra_id: string; tipo_servico: string; tipo_hora: TipoHora; hora_entrada: string; hora_saida: string; total_horas: number; descricao?: string; }) {
    if (!editingApt) return;
    try { await updateApt.mutateAsync({ id: editingApt.id, ...data }); toast.success('Registo actualizado.'); setEditingApt(null); }
    catch { toast.error('Erro ao actualizar o registo.'); }
  }
  async function handleDelete() {
    if (!deletingAptId) return;
    try { await deleteApt.mutateAsync(deletingAptId); toast.success('Registo eliminado.'); setDeletingAptId(null); }
    catch { toast.error('Erro ao eliminar o registo.'); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <PageHeader
        title={`Olá, ${profile?.full_name?.split(' ')[0] ?? ''}`}
        actions={
          <Button className="bg-navy hover:bg-navy-light text-white gap-1.5 text-sm" onClick={() => setModalOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
            Registar Horas
          </Button>
        }
      />

      {/* ── Resumo em linha — compacto, sem caixas ── */}
      {!isLoading && apontamentos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-navy">{fmt(horasMes)}</span>
          <span className="text-xs text-gray-muted">em {MES}</span>
          <span className="w-1 h-1 rounded-full bg-gray-border inline-block" />
          <span className="text-sm font-bold text-navy">{apontamentos.length}</span>
          <span className="text-xs text-gray-muted">registo{apontamentos.length !== 1 ? 's' : ''}</span>
          {pendentes > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-border inline-block" />
              <span className="flex items-center gap-1 text-xs font-semibold text-warning">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
                {pendentes} pendente{pendentes !== 1 ? 's' : ''} de aprovação
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Pesquisa + filtros ── */}
      <div className="flex gap-2 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-muted pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Pesquisar por obra ou tipo de serviço..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-9 rounded-xl border border-gray-border bg-white text-sm text-gray-text placeholder:text-gray-muted/50 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-muted hover:text-gray-text transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Estado — botões pequenos, sem select nativo */}
        <div className="flex items-center gap-1 bg-white border border-gray-border rounded-xl px-1.5 py-1.5 shrink-0">
          {([
            { v: '',          l: 'Todos'    },
            { v: 'pendente',  l: 'Pendente' },
            { v: 'aprovado',  l: 'Aprovado' },
            { v: 'rejeitado', l: 'Rejeitado'},
          ] as { v: ApontamentoStatus | ''; l: string }[]).map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={`h-7 px-3 rounded-lg text-[11px] font-semibold transition-all ${
                filterStatus === v
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-gray-muted hover:text-navy hover:bg-gray-bg'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Obra — só se houver histórico */}
        {obrasHist.length > 0 && (
          <div className="relative shrink-0">
            <select
              value={filterObra}
              onChange={e => setFilterObra(e.target.value)}
              className="h-10 pl-4 pr-9 rounded-xl border border-gray-border bg-white text-xs font-medium text-gray-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30 transition-all max-w-[190px]"
            >
              <option value="">Todas as obras</option>
              {obrasHist.map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-muted pointer-events-none">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        )}

        {/* Limpar */}
        {hasFilter && (
          <button onClick={clear} className="h-10 px-3.5 rounded-xl border border-gray-border bg-white flex items-center gap-1.5 text-xs font-medium text-gray-muted hover:text-error hover:border-error/30 transition-all shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
            Limpar
          </button>
        )}
      </div>

      {/* Contador de resultados filtrados */}
      {hasFilter && !isLoading && (
        <p className="text-xs text-gray-muted px-0.5">
          {filtered.length === 0
            ? 'Nenhum resultado.'
            : <><span className="font-semibold text-navy">{filtered.length}</span> de {apontamentos.length} registo{apontamentos.length !== 1 ? 's' : ''}</>
          }
        </p>
      )}

      {/* ── Conteúdo ── */}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-7 h-7 border-[2.5px] border-navy border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-muted">A carregar...</p>
        </div>

      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl border border-gray-border bg-gray-bg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-gray-muted">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-navy">{apontamentos.length === 0 ? 'Sem registos de horas' : 'Nenhum resultado'}</p>
            <p className="text-xs text-gray-muted">{apontamentos.length === 0 ? 'Clique em "Registar Horas" para começar.' : 'Tente ajustar os filtros.'}</p>
          </div>
          {hasFilter && <button onClick={clear} className="text-xs text-accent-blue hover:underline font-medium">Limpar filtros</button>}
        </div>

      ) : (

        /* ── Grupos por data — cabeçalhos editoriais ── */
        <div>
          {sortedDates.map((date, i) => {
            const apts = grouped[date];
            const { weekday, day, month } = parseDate(date);
            const grupoH = apts.reduce((s, a) => s + (a.total_horas ?? 0), 0);

            return (
              <section
                key={date}
                className={i > 0 ? 'mt-8 pt-8 border-t border-gray-border' : ''}
              >
                {/* Cabeçalho editorial */}
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-muted mb-0.5">
                      {weekday}
                    </p>
                    <h2 className="text-[19px] font-black text-navy leading-none capitalize">
                      {day} de {month}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 pb-0.5">
                    {grupoH > 0 && (
                      <span className="text-sm font-bold text-gray-text">{fmt(grupoH)}</span>
                    )}
                    <span className="text-xs text-gray-muted font-medium">
                      {apts.length} reg.
                    </span>
                  </div>
                </div>

                {/* Grid 1 → 2 colunas, min-w-0 previne overflow */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {apts.map(apt => (
                    <div key={apt.id} className="min-w-0">
                      <EntryCard
                        apontamento={{
                          id:           apt.id,
                          obra_codigo:  apt.obra?.codigo  ?? '',
                          obra_nome:    apt.obra?.nome    ?? '',
                          tipo_servico: apt.tipo_servico,
                          hora_entrada: apt.hora_entrada,
                          hora_saida:   apt.hora_saida    ?? '',
                          total_horas:  apt.total_horas   ?? 0,
                          tipo_hora:    apt.tipo_hora,
                          status:       apt.status,
                          fotos_count:  apt.fotos?.length ?? 0,
                        }}
                        onEdit={apt.status === 'pendente' ? () => setEditingApt(apt)        : undefined}
                        onDelete={apt.status === 'pendente' ? () => setDeletingAptId(apt.id) : undefined}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Modais */}
      <ApontarModal open={modalOpen} onClose={() => setModalOpen(false)} obras={obras} onSubmit={handleApontar} isSubmitting={createApt.isPending} blockedDates={blockedDates} />
      <EditarApontamentoModal open={editingApt !== null} onClose={() => setEditingApt(null)} apontamento={editingApt} obras={obras} onSubmit={handleEdit} isSubmitting={updateApt.isPending} />
      <ConfirmDialog
        open={deletingAptId !== null}
        onOpenChange={o => { if (!o) setDeletingAptId(null); }}
        title="Eliminar Registo"
        description="Tem a certeza que deseja eliminar este registo? Esta acção não pode ser desfeita."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        isLoading={deleteApt.isPending}
        variant="danger"
      />
    </div>
  );
}
