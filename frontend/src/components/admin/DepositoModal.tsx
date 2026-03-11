'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Profile } from '@/types';

// ─── Style constants ──────────────────────────────────────────────────────────
const sDlg       = 'flex flex-col w-[92vw] sm:w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 shadow-xl bg-white';
const sInput     = 'h-10 rounded-xl border-slate-200 bg-slate-50 text-sm shadow-none';
const sInputErr  = 'h-10 rounded-xl border-red-400 bg-red-50 text-sm shadow-none';
const sTrigger   = '!h-10 !py-0 rounded-xl border-slate-200 bg-slate-50 shadow-none text-sm';
const sTriggerErr= '!h-10 !py-0 rounded-xl border-red-400 bg-red-50 shadow-none text-sm';
const sTextarea  = 'rounded-xl border-slate-200 bg-slate-50 text-sm shadow-none resize-none';

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
  tecnico_id:    z.string().min(1, 'Selecione o técnico'),
  valor:         z.coerce.number({ invalid_type_error: 'Introduza um valor válido' }).positive('O valor deve ser positivo'),
  data_deposito: z.string().min(1, 'Informe a data'),
  descricao:     z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface DepositoModalProps {
  open:              boolean;
  onClose:           () => void;
  tecnicos:          Profile[];
  onSubmit: (data: {
    tecnico_id: string;
    valor: number;
    data_deposito: string;
    descricao?: string;
  }) => void;
  isSubmitting?:     boolean;
  defaultTecnicoId?: string;
}

export function DepositoModal({ open, onClose, tecnicos, onSubmit, isSubmitting, defaultTecnicoId }: DepositoModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [selectedTecnicoId, setSelectedTecnicoId] = useState(defaultTecnicoId ?? '');

  const {
    register, handleSubmit, setValue, reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { data_deposito: today, tecnico_id: defaultTecnicoId ?? '' },
  });

  // Pré-seleccionar técnico quando o modal abre
  useEffect(() => {
    if (open) {
      const tid = defaultTecnicoId ?? '';
      setSelectedTecnicoId(tid);
      setValue('tecnico_id', tid, { shouldValidate: false });
    }
  }, [open, defaultTecnicoId, setValue]);

  function handleFormSubmit(data: FormData) {
    onSubmit({ ...data, descricao: data.descricao || undefined });
    reset({ data_deposito: today, tecnico_id: '' });
    setSelectedTecnicoId('');
  }

  function handleClose() {
    reset({ data_deposito: today, tecnico_id: '' });
    setSelectedTecnicoId('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className={sDlg} showCloseButton={false}>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">Registar Depósito</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Preencha os dados do depósito</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
            >
              <IconClose />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-3">

            {/* Técnico */}
            <div>
              <Lbl>Funcionário</Lbl>
              <Select
                value={selectedTecnicoId}
                onValueChange={(v) => {
                  setSelectedTecnicoId(v);
                  setValue('tecnico_id', v, { shouldValidate: true });
                }}
              >
                <SelectTrigger className={errors.tecnico_id ? sTriggerErr : sTrigger}>
                  <SelectValue placeholder="Selecione o técnico" />
                </SelectTrigger>
                <SelectContent>
                  {tecnicos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Err msg={errors.tecnico_id?.message} />
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <Lbl>Valor (€)</Lbl>
                <Input
                  type="number" step="0.01" min="0.01" placeholder="0,00"
                  {...register('valor')}
                  className={errors.valor ? sInputErr : sInput}
                />
                <Err msg={errors.valor?.message} />
              </div>
              <div className="min-w-0">
                <Lbl>Data</Lbl>
                <Input
                  type="date"
                  {...register('data_deposito')}
                  className={errors.data_deposito ? sInputErr : sInput}
                />
                <Err msg={errors.data_deposito?.message} />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <Lbl>Descrição (opcional)</Lbl>
              <Textarea
                {...register('descricao')}
                placeholder="Ex: Adiantamento mês de Fevereiro..."
                rows={2}
                className={sTextarea}
              />
            </div>

          </div>

          {/* Footer */}
          <div className="flex gap-3 px-4 py-3.5 border-t border-slate-100 shrink-0 bg-white">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-60"
            >
              <IconX /> Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-navy text-sm font-semibold text-white hover:bg-navy-light transition-colors shadow-sm shadow-navy/20 disabled:opacity-60"
            >
              {isSubmitting ? 'A registar...' : (<>Registar Depósito <IconArrow /></>)}
            </button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
