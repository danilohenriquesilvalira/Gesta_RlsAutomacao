'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from 'radix-ui';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HoraTypeSelector } from './HoraTypeSelector';
import { calcTotalHoras } from '@/lib/utils/calcHoras';
import { TIPOS_SERVICO, type TipoHora } from '@/types';
import type { Obra } from '@/types';

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

function getToday() { return new Date().toISOString().split('T')[0]; }

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  data_apontamento: z.string().min(1, 'Data obrigatória'),
  obra_id:          z.string().optional(),
  tipo_servico:     z.string().min(1, 'Tipo obrigatório'),
  hora_entrada:     z.string().min(1, 'Obrigatório'),
  hora_saida:       z.string().min(1, 'Obrigatório'),
});
type FormData    = z.infer<typeof schema>;
type TipoRegisto = 'obra' | 'oficina';

interface ApontarModalProps {
  open: boolean;
  onClose: () => void;
  obras: Obra[];
  onSubmit: (data: {
    obra_id: string | null; data_apontamento: string; tipo_servico: string;
    tipo_hora: TipoHora; hora_entrada: string; hora_saida: string;
    total_horas: number; fotos_base64: string[];
  }) => void;
  isSubmitting?: boolean;
  blockedDates?: string[];
}

/*
 * Native inputs para date/time — evita conflitos com display:flex do shadcn
 * em Android e garante sizing correto dentro do dialog compacto.
 */
const nativeField: React.CSSProperties = {
  display: 'block',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  height: '40px',
  lineHeight: '40px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  padding: '0 12px',
  fontSize: '14px',
  color: '#1e293b',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
  WebkitAppearance: 'none',
};
const nativeFieldErr: React.CSSProperties = {
  ...nativeField,
  borderColor: '#f87171',
  backgroundColor: '#fef2f2',
};

// SelectTrigger — mesma altura 40px que os inputs
const sTrigger    = '!h-10 !py-0 rounded-xl border-slate-200 bg-slate-50 shadow-none text-sm';
const sTriggerErr = '!h-10 !py-0 rounded-xl border-red-400 bg-red-50 shadow-none text-sm';

export function ApontarModal({ open, onClose, obras, onSubmit, isSubmitting, blockedDates = [] }: ApontarModalProps) {
  const [tipoRegisto, setTipoRegisto] = useState<TipoRegisto>('obra');
  const [tipoHora,    setTipoHora]    = useState<TipoHora>('normal');

  const {
    register, handleSubmit, setValue, watch, reset, setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { data_apontamento: getToday() },
  });

  const horaEntrada = watch('hora_entrada');
  const horaSaida   = watch('hora_saida');
  const totalHoras  = horaEntrada && horaSaida ? calcTotalHoras(horaEntrada, horaSaida) : null;

  function resetForm() {
    reset({ data_apontamento: getToday() });
    setTipoHora('normal');
    setTipoRegisto('obra');
  }
  function handleFormSubmit(data: FormData) {
    if (tipoRegisto === 'obra' && !data.obra_id) {
      setError('obra_id', { message: 'Selecione a obra' });
      return;
    }
    if (blockedDates.includes(data.data_apontamento)) {
      setError('data_apontamento', { message: 'Já existe um registo para esta data. Escolha outra data.' });
      return;
    }
    const total = calcTotalHoras(data.hora_entrada, data.hora_saida);
    onSubmit({ ...data, obra_id: tipoRegisto === 'oficina' ? null : data.obra_id!, tipo_hora: tipoHora, total_horas: total, fotos_base64: [] });
    resetForm();
  }
  function handleClose() { resetForm(); onClose(); }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />
        <Dialog.Content
          className={cn(
            'flex flex-col',
            'fixed z-50 bg-white overflow-hidden outline-none',
            'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-[92vw] max-h-[85vh]',
            'sm:w-full sm:max-w-lg sm:max-h-[90vh]',
            'rounded-2xl border border-slate-200 shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            'duration-200',
          )}
        >
          <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">

            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-3.5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">Registar Horas</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Preencha os dados do serviço</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
              >
                <IconClose />
              </button>
            </div>

            {/* Body — conteúdo inline (sem wrapper component para evitar remount dos Selects) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-2.5 sm:py-3 space-y-2.5 sm:space-y-3">

              {/* Local de Trabalho */}
              <div>
                <Lbl>Local de Trabalho</Lbl>
                <Select value={tipoRegisto} onValueChange={(v) => setTipoRegisto(v as TipoRegisto)}>
                  <SelectTrigger className={sTrigger}><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="obra">Obra</SelectItem>
                    <SelectItem value="oficina">Oficina</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Obra */}
              {tipoRegisto === 'obra' && (
                <div>
                  <Lbl>Obra</Lbl>
                  <Select onValueChange={(v) => setValue('obra_id', v, { shouldValidate: true })}>
                    <SelectTrigger className={errors.obra_id ? sTriggerErr : sTrigger}>
                      <SelectValue className="truncate" placeholder="Selecione a obra..." />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {obras.filter((o) => o.status === 'ativa').map((obra) => (
                        <SelectItem key={obra.id} value={obra.id}>{obra.codigo} — {obra.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Err msg={errors.obra_id?.message} />
                </div>
              )}

              {/* Data */}
              <div>
                <Lbl>Data do Registo</Lbl>
                <input
                  type="date"
                  {...register('data_apontamento')}
                  max={getToday()}
                  style={errors.data_apontamento ? nativeFieldErr : nativeField}
                />
                <Err msg={errors.data_apontamento?.message} />
              </div>

              {/* Tipo de Serviço */}
              <div>
                <Lbl>Tipo de Serviço</Lbl>
                <Select onValueChange={(v) => setValue('tipo_servico', v, { shouldValidate: true })}>
                  <SelectTrigger className={errors.tipo_servico ? sTriggerErr : sTrigger}>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {TIPOS_SERVICO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Err msg={errors.tipo_servico?.message} />
              </div>

              {/* Hora Entrada */}
              <div>
                <Lbl>Hora Entrada</Lbl>
                <input
                  type="time"
                  {...register('hora_entrada')}
                  style={errors.hora_entrada ? { ...nativeFieldErr, textAlign: 'center' } : { ...nativeField, textAlign: 'center' }}
                />
                <Err msg={errors.hora_entrada?.message} />
              </div>

              {/* Hora Saída */}
              <div>
                <Lbl>Hora Saída</Lbl>
                <input
                  type="time"
                  {...register('hora_saida')}
                  style={errors.hora_saida ? { ...nativeFieldErr, textAlign: 'center' } : { ...nativeField, textAlign: 'center' }}
                />
                <Err msg={errors.hora_saida?.message} />
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

            </div>

            {/* Footer */}
            <div className="flex gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 border-t border-slate-100 shrink-0 bg-white">
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <IconX /> Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-navy text-sm font-semibold text-white hover:bg-navy-light transition-colors shadow-sm shadow-navy/20 disabled:opacity-60"
              >
                {isSubmitting ? 'A guardar...' : (<>Guardar <IconArrow /></>)}
              </button>
            </div>

          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
