'use client';

import { useState, useEffect, useRef } from 'react';
import { useObras, useCreateObra, useUpdateObra, useDeleteObra } from '@/lib/queries/obras';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Obra, ObraStatus } from '@/types';
import { toast } from 'sonner';

const STATUS_LABELS: Record<ObraStatus, string> = {
  ativa: 'Ativa',
  pausada: 'Pausada',
  concluida: 'Concluída',
};

const STATUS_COLORS: Record<ObraStatus, string> = {
  ativa: 'bg-emerald-100 text-emerald-700',
  pausada: 'bg-amber-100 text-amber-700',
  concluida: 'bg-gray-100 text-gray-500',
};

// ── Nominatim types ────────────────────────────────────────────────────────────

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
  };
}

// ── Form type ──────────────────────────────────────────────────────────────────

type FormData = {
  codigo: string;
  nome: string;
  cliente: string;
  status: ObraStatus;
  localizacao: string;
  lat: number | null;
  lng: number | null;
};

const emptyForm: FormData = {
  codigo: '',
  nome: '',
  cliente: '',
  status: 'ativa',
  localizacao: '',
  lat: null,
  lng: null,
};

// ── LocationPicker ─────────────────────────────────────────────────────────────

interface LocationPickerProps {
  localizacao: string;
  lat: number | null;
  lng: number | null;
  onChange: (loc: { localizacao: string; lat: number | null; lng: number | null }) => void;
}

function LocationPicker({ localizacao, lat, lng, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Pesquisa com debounce 450ms
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 2) { setSuggestions([]); setShowDrop(false); return; }

    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&accept-language=pt`,
          { headers: { 'Accept': 'application/json' } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setShowDrop(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  function selectSuggestion(s: NominatimResult) {
    onChange({ localizacao: s.display_name, lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setQuery('');
    setSuggestions([]);
    setShowDrop(false);
  }

  function confirmFreeText() {
    if (!query.trim()) return;
    onChange({ localizacao: query.trim(), lat: null, lng: null });
    setQuery('');
    setShowDrop(false);
  }

  const mapsUrl = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : localizacao
    ? `https://www.google.com/maps/search/${encodeURIComponent(localizacao)}`
    : null;

  // Se já tem localização definida
  if (localizacao) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-start gap-2.5">
          <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-800 font-medium leading-relaxed">{localizacao}</p>
            <div className="flex items-center gap-3 mt-1">
              {lat && lng && (
                <p className="text-[10px] text-emerald-600">{lat.toFixed(4)}, {lng.toFixed(4)}</p>
              )}
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-accent-blue hover:underline font-medium">
                  Ver no mapa ↗
                </a>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ localizacao: '', lat: null, lng: null })}
            className="shrink-0 p-1 rounded-md text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-colors"
            title="Remover localização"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Campo de pesquisa
  return (
    <div ref={wrapRef} className="relative space-y-2">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {searching ? (
            <svg className="animate-spin text-gray-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-muted">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          )}
        </div>
        <Input
          placeholder="Pesquisar endereço... (ex: Rua de Lisboa, Paris, Madrid)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDrop(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); confirmFreeText(); }
            if (e.key === 'Escape') setShowDrop(false);
          }}
          className="pl-9 pr-3 text-sm"
        />
      </div>

      {/* Dica */}
      <p className="text-[10px] text-gray-muted px-1">
        Escreva qualquer endereço e selecione da lista. Prima Enter para guardar sem selecionar.
      </p>

      {/* Dropdown de sugestões */}
      {showDrop && suggestions.length > 0 && (
        <div className="absolute z-50 top-[calc(100%-1.25rem)] left-0 right-0 bg-white border border-gray-border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s) => {
            const parts = s.display_name.split(', ');
            const title = parts.slice(0, 2).join(', ');
            const subtitle = parts.slice(2).join(', ');
            return (
              <button
                key={s.place_id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-border/50 last:border-0 text-left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-accent-blue">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-navy truncate">{title}</p>
                  {subtitle && <p className="text-[10px] text-gray-muted truncate">{subtitle}</p>}
                </div>
              </button>
            );
          })}
          {/* Opção de texto livre */}
          {query.trim() && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); confirmFreeText(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors border-t border-gray-border text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-muted">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
              <p className="text-xs text-gray-muted">Guardar "<span className="font-medium text-navy">{query}</span>" como está</p>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MinhasObrasPage() {
  const { profile } = useAuth();
  const { data: obras = [], isLoading } = useObras();
  const createObra = useCreateObra();
  const updateObra = useUpdateObra();
  const deleteObra = useDeleteObra();

  const [filter, setFilter] = useState<ObraStatus | 'todas'>('ativa');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingObra, setEditingObra] = useState<Obra | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Obra | null>(null);
  const [statusAtual, setStatusAtual] = useState<ObraStatus>('ativa');

  const filtered = filter === 'todas' ? obras : obras.filter((o) => o.status === filter);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.codigo.trim()) e.codigo = 'Obrigatório';
    if (!form.nome.trim()) e.nome = 'Obrigatório';
    if (!form.cliente.trim()) e.cliente = 'Obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function openCreate() {
    setEditingObra(null);
    setForm(emptyForm);
    setStatusAtual('ativa');
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(obra: Obra) {
    setEditingObra(obra);
    setStatusAtual(obra.status);
    setForm({
      codigo: obra.codigo,
      nome: obra.nome,
      cliente: obra.cliente,
      status: obra.status,
      localizacao: obra.localizacao ?? '',
      lat: obra.lat ?? null,
      lng: obra.lng ?? null,
    });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSave() {
    if (!validate()) return;
    try {
      if (editingObra) {
        await updateObra.mutateAsync({
          id: editingObra.id,
          codigo: form.codigo.trim(),
          nome: form.nome.trim(),
          cliente: form.cliente.trim(),
          status: statusAtual,
          localizacao: form.localizacao || null,
          lat: form.lat,
          lng: form.lng,
        });
        toast.success('Obra atualizada!');
      } else {
        const nova = await createObra.mutateAsync({
          codigo: form.codigo.trim(),
          nome: form.nome.trim(),
          cliente: form.cliente.trim(),
          created_by: profile?.id,
          localizacao: form.localizacao || undefined,
          lat: form.lat ?? undefined,
          lng: form.lng ?? undefined,
        });
        toast.success(`Obra "${nova.nome}" criada!`);
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao guardar obra');
    }
  }

  async function handleFinalize(obra: Obra) {
    try {
      await updateObra.mutateAsync({ id: obra.id, status: 'concluida' });
      toast.success(`"${obra.nome}" concluída!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao finalizar obra');
    }
  }

  async function handleReactivate(obra: Obra) {
    try {
      await updateObra.mutateAsync({ id: obra.id, status: 'ativa' });
      toast.success(`"${obra.nome}" reativada!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reativar obra');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteObra.mutateAsync(deleteTarget.id);
      toast.success('Obra eliminada');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao eliminar obra');
    }
  }

  const isBusy = createObra.isPending || updateObra.isPending;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy">Obras</h1>
          <p className="text-sm text-gray-muted">Gerir os seus projetos e obras</p>
        </div>
        <Button onClick={openCreate} className="bg-navy hover:bg-navy-light text-white shrink-0 text-sm">
          + Nova Obra
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(['todas', 'ativa', 'pausada', 'concluida'] as const).map((s) => {
          const count = s === 'todas' ? obras.length : obras.filter((o) => o.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                filter === s
                  ? 'bg-navy text-white border-navy shadow-sm'
                  : 'bg-white text-gray-text border-gray-border hover:border-navy/40 hover:text-navy'
              }`}
            >
              {s === 'todas' ? 'Todas' : STATUS_LABELS[s]}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filter === s ? 'bg-white/20' : 'bg-gray-100'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-200">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
          </svg>
          <div>
            <p className="text-gray-muted text-sm font-medium">Nenhuma obra encontrada</p>
            {filter !== 'todas' && (
              <button className="text-xs text-accent-blue hover:underline mt-1" onClick={() => setFilter('todas')}>
                Ver todas as obras
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((obra) => (
            <ObraCard
              key={obra.id}
              obra={obra}
              onEdit={() => openEdit(obra)}
              onFinalize={() => handleFinalize(obra)}
              onReactivate={() => handleReactivate(obra)}
              onDelete={() => setDeleteTarget(obra)}
              isUpdating={updateObra.isPending && (updateObra.variables as any)?.id === obra.id}
            />
          ))}
        </div>
      )}

      {/* ── Modal Criar / Editar ── */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-navy font-bold">
              {editingObra ? 'Editar Obra' : 'Nova Obra'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Código */}
            <div className="space-y-1.5">
              <Label>Código *</Label>
              <Input
                placeholder="Ex: OB-042"
                value={form.codigo}
                onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
                className={errors.codigo ? 'border-error' : ''}
              />
              {errors.codigo && <p className="text-[11px] text-error">{errors.codigo}</p>}
            </div>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Nome da Obra *</Label>
              <Input
                placeholder="Descrição / nome do projeto"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                className={errors.nome ? 'border-error' : ''}
              />
              {errors.nome && <p className="text-[11px] text-error">{errors.nome}</p>}
            </div>

            {/* Cliente */}
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Input
                placeholder="Nome do cliente (ex: EDP, Galp...)"
                value={form.cliente}
                onChange={(e) => setForm((p) => ({ ...p, cliente: e.target.value }))}
                className={errors.cliente ? 'border-error' : ''}
              />
              {errors.cliente && <p className="text-[11px] text-error">{errors.cliente}</p>}
            </div>

            {/* Localização */}
            <div className="space-y-1.5">
              <Label>Localização</Label>
              <LocationPicker
                localizacao={form.localizacao}
                lat={form.lat}
                lng={form.lng}
                onChange={(loc) => setForm((p) => ({ ...p, ...loc }))}
              />
            </div>

            {/* Estado — só na edição */}
            {editingObra && (
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={statusAtual} onValueChange={(v) => setStatusAtual(v as ObraStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-navy hover:bg-navy-light text-white"
                onClick={handleSave}
                disabled={isBusy}
              >
                {isBusy ? 'A guardar...' : editingObra ? 'Guardar alterações' : 'Criar Obra'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar eliminação ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-navy">Eliminar Obra</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg bg-error/5 border border-error/20 p-3 my-1">
            <p className="text-sm font-semibold text-navy">{deleteTarget?.codigo} — {deleteTarget?.nome}</p>
            <p className="text-xs text-gray-muted mt-0.5">{deleteTarget?.cliente}</p>
          </div>
          <p className="text-sm text-gray-text">
            Esta ação é permanente. As despesas associadas <strong>não serão eliminadas</strong>.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-error hover:bg-error/90 text-white"
              onClick={handleDelete}
              disabled={deleteObra.isPending}
            >
              {deleteObra.isPending ? 'A eliminar...' : 'Eliminar obra'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Obra Card ──────────────────────────────────────────────────────────────────

interface ObraCardProps {
  obra: Obra;
  isUpdating?: boolean;
  onEdit: () => void;
  onFinalize: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}

function ObraCard({ obra, isUpdating, onEdit, onFinalize, onReactivate, onDelete }: ObraCardProps) {
  const mapsUrl =
    obra.lat && obra.lng
      ? `https://www.google.com/maps?q=${obra.lat},${obra.lng}`
      : obra.localizacao
      ? `https://www.google.com/maps/search/${encodeURIComponent(obra.localizacao)}`
      : null;

  return (
    <div className={`bg-white rounded-xl border p-4 flex flex-col gap-3 transition-all ${
      isUpdating ? 'opacity-60 border-gray-border' : 'border-gray-border hover:border-navy/25 hover:shadow-sm'
    }`}>
      {/* Topo */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-accent-blue tracking-widest uppercase mb-0.5">
            {obra.codigo}
          </p>
          <p className="font-semibold text-navy text-[15px] leading-snug">{obra.nome}</p>
        </div>
        <span className={`shrink-0 mt-0.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${STATUS_COLORS[obra.status]}`}>
          {STATUS_LABELS[obra.status]}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-1.5 flex-1">
        {/* Cliente */}
        <div className="flex items-center gap-2 text-xs text-gray-muted">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <rect width="20" height="14" x="2" y="7" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <span className="truncate">{obra.cliente}</span>
        </div>

        {/* Executante */}
        {obra.executante?.full_name && (
          <div className="flex items-center gap-2 text-xs text-gray-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
            <span className="truncate">{obra.executante.full_name}</span>
          </div>
        )}

        {obra.localizacao && (
          <div className="flex items-start gap-2 text-xs text-gray-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
            </svg>
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="hover:text-accent-blue hover:underline transition-colors"
                onClick={(e) => e.stopPropagation()}>
                {obra.localizacao}
              </a>
            ) : (
              <span>{obra.localizacao}</span>
            )}
          </div>
        )}
      </div>

      {/* Progresso */}
      {obra.progresso > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-muted">
            <span>Progresso</span>
            <span className="font-semibold">{obra.progresso}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100">
            <div className="h-1.5 rounded-full bg-accent-blue" style={{ width: `${obra.progresso}%` }} />
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-1 pt-2 border-t border-gray-border/70">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-text hover:text-navy py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          Editar
        </button>

        <div className="w-px h-5 bg-gray-border/60" />

        {obra.status !== 'concluida' ? (
          <button
            onClick={onFinalize}
            disabled={isUpdating}
            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Finalizar
          </button>
        ) : (
          <button
            onClick={onReactivate}
            disabled={isUpdating}
            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-accent-blue hover:text-accent-blue/80 py-1.5 rounded-lg hover:bg-accent-blue/5 transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
            Reativar
          </button>
        )}

        <div className="w-px h-5 bg-gray-border/60" />

        <button
          onClick={onDelete}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-muted hover:text-error hover:bg-error/8 transition-colors"
          title="Eliminar obra"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
