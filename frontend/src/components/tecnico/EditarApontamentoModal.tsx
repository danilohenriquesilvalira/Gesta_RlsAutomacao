'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HoraTypeSelector } from '@/components/shared/HoraTypeSelector';
import { calcTotalHoras } from '@/lib/utils/calcHoras';
import { TIPOS_SERVICO, type TipoHora } from '@/types';
import type { Apontamento, Obra } from '@/types';

// ─── Style constants ──────────────────────────────────────────────────────────
const sDlg      = 'flex flex-col w-[92vw] sm:w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 shadow-xl bg-white';
const sTrigger  = '!h-10 !py-0 rounded-xl border-slate-200 bg-slate-50 shadow-none text-sm';
const sTriggerErr='!h-10 !py-0 rounded-xl border-red-400 bg-red-50 shadow-none text-sm';
const sTextarea = 'rounded-xl border-slate-200 bg-slate-50 text-sm shadow-none resize-none';

// ─── Native input style (date/time — garante sizing correto em Android/iOS) ───
const nativeField: React.CSSProperties = {
  display: 'block', width: '100%', maxWidth: '100%', minWidth: 0,
  height: '40px', lineHeight: '40px', borderRadius: '12px',
  border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
  padding: '0 12px', fontSize: '14px', color: '#1e293b',
  boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  WebkitAppearance: 'none',
};
const nativeFieldErr: React.CSSProperties = {
  ...nativeField, borderColor: '#f87171', backgroundColor: '#fef2f2',
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Lbl = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{children}</p>
);
const Err = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-[10px] text-red-500 font-medium mt-0.5">{msg}</p> : null;

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  obra_id:      z.string().min(1, 'Selecione a obra'),
  tipo_servico: z.string().min(1, 'Selecione o tipo de serviço'),
  hora_entrada: z.string().min(1, 'Informe a hora de entrada'),
  hora_saida:   z.string().min(1, 'Informe a hora de saída'),
  descricao:    z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface EditarApontamentoModalProps {
  open:     boolean;
  onClose:  () => void;
  apontamento: Apontamento | null;
  obras:    Obra[];
  onSubmit: (data: {
    obra_id: string;
    tipo_servico: string;
    tipo_hora: TipoHora;
    hora_entrada: string;
    hora_saida: string;
    total_horas: number;
    descricao?: string;
  }) => void;
  isSubmitting?: boolean;
}

export function EditarApontamentoModal({
  open, onClose, apontamento, obras, onSubmit, isSubmitting,
}: EditarApontamentoModalProps) {
  const [tipoHora, setTipoHora] = useState<TipoHora>('normal');

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Pre-fill form when apontamento changes
  useEffect(() => {
    if (apontamento) {
      reset({
        obra_id:      apontamento.obra_id ?? '',
        tipo_servico: apontamento.tipo_servico,
        hora_entrada: apontamento.hora_entrada,
        hora_saida:   apontamento.hora_saida ?? '',
        descricao:    apontamento.descricao ?? '',
      });
      setTipoHora(apontamento.tipo_hora);
    }
  }, [apontamento, reset]);

  const horaEntrada = watch('hora_entrada');
  const horaSaida   = watch('hora_saida');
  const totalHoras  = horaEntrada && horaSaida ? calcTotalHoras(horaEntrada, horaSaida) : null;

  function handleFormSubmit(data: FormData) {
    const total = calcTotalHoras(data.hora_entrada, data.hora_saida);
    onSubmit({ ...data, tipo_hora: tipoHora, total_horas: total, descricao: data.descricao || undefined });
  }

  if (!apontamento) return null;

  // All obras shown (active + current obra in case it's no longer active)
  const obrasVisiveis = obras.filter(
    (o) => o.status === 'ativa' || o.id === apontamento.obra_id
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={sDlg} showCloseButton={false}>
        <form
          key={apontamento.id}
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">Editar Registo</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Atualize os dados do serviço</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
            >
              <IconClose />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-3">

            {/* Obra */}
            <div>
              <Lbl>Obra</Lbl>
              <Select
                defaultValue={apontamento.obra_id ?? undefined}
                onValueChange={(v) => setValue('obra_id', v, { shouldValidate: true })}
              >
                <SelectTrigger className={errors.obra_id ? sTriggerErr : sTrigger}>
                  <SelectValue placeholder="Selecione a obra" />
                </SelectTrigger>
                <SelectContent>
                  {obrasVisiveis.map((obra) => (
                    <SelectItem key={obra.id} value={obra.id}>
                      {obra.codigo} — {obra.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Err msg={errors.obra_id?.message} />
            </div>

            {/* Tipo de Serviço */}
            <div>
              <Lbl>Tipo de Serviço</Lbl>
              <Select
                defaultValue={apontamento.tipo_servico}
                onValueChange={(v) => setValue('tipo_servico', v, { shouldValidate: true })}
              >
                <SelectTrigger className={errors.tipo_servico ? sTriggerErr : sTrigger}>
                  <SelectValue placeholder="Tipo de trabalho" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_SERVICO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Err msg={errors.tipo_servico?.message} />
            </div>

            {/* Horas — native inputs para sizing correto em mobile */}
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <Lbl>Hora Entrada</Lbl>
                <input
                  type="time"
                  {...register('hora_entrada')}
                  style={errors.hora_entrada ? { ...nativeFieldErr, textAlign: 'center' } : { ...nativeField, textAlign: 'center' }}
                />
                <Err msg={errors.hora_entrada?.message} />
              </div>
              <div className="min-w-0">
                <Lbl>Hora Saída</Lbl>
                <input
                  type="time"
                  {...register('hora_saida')}
                  style={errors.hora_saida ? { ...nativeFieldErr, textAlign: 'center' } : { ...nativeField, textAlign: 'center' }}
                />
                <Err msg={errors.hora_saida?.message} />
              </div>
            </div>

            {/* Total */}
            {totalHoras !== null && (
              <div className="flex items-center justify-center gap-3 bg-emerald-50 rounded-xl py-2.5 border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black text-emerald-700 tabular-nums leading-none">{totalHoras.toFixed(2)}h</span>
              </div>
            )}

            {/* Classificação */}
            <div>
              <Lbl>Classificação de Horas</Lbl>
              <HoraTypeSelector value={tipoHora} onChange={setTipoHora} />
            </div>

            {/* Descrição */}
            <div>
              <Lbl>Descrição (Opcional)</Lbl>
              <Textarea
                {...register('descricao')}
                placeholder="Detalhes sobre o serviço..."
                rows={3}
                className={sTextarea}
              />
            </div>

            {/* Fotos existentes (apenas informativo) */}
            {(apontamento.fotos?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-[11px] text-slate-400">
                  {apontamento.fotos?.length} foto(s) associada(s) — as fotos não são alteradas nesta edição.
                </span>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex gap-3 px-4 py-3.5 border-t border-slate-100 shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <IconX /> Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-navy text-sm font-semibold text-white hover:bg-navy-light transition-colors shadow-sm shadow-navy/20 disabled:opacity-60"
            >
              {isSubmitting ? 'A guardar...' : (<>Guardar Alterações <IconArrow /></>)}
            </button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
