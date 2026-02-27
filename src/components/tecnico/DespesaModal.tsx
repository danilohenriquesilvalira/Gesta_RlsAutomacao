'use client';

import { useState, useEffect } from 'react';
import { Wrench } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
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
import { ReciboUpload, type ReciboFile } from './ReciboUpload';
import { useCreateObra } from '@/lib/queries/obras';
import { useDeleteRecibo } from '@/lib/queries/despesas';
import { TIPOS_DESPESA, type TipoDespesa } from '@/types';
import type { Obra, Despesa, ReciboDespesa } from '@/types';

const OFICINA_VALUE = '__oficina__';

// ─── Style constants ──────────────────────────────────────────────────────────
const sDlg       = 'flex flex-col w-[92vw] sm:w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 shadow-xl bg-white';
const sInput     = 'h-10 rounded-xl border-slate-200 bg-slate-50 text-sm shadow-none';
const sInputErr  = 'h-10 rounded-xl border-red-400 bg-red-50 text-sm shadow-none';
const sTrigger   = '!h-10 !py-0 rounded-xl border-slate-200 bg-slate-50 shadow-none text-sm';
const sTriggerErr= '!h-10 !py-0 rounded-xl border-red-400 bg-red-50 shadow-none text-sm';
const sTextarea  = 'rounded-xl border-slate-200 bg-slate-50 text-sm shadow-none resize-none';

// ─── Native input style (date — garante sizing correto em Android/iOS) ────────
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

// ─── Schemas ──────────────────────────────────────────────────────────────────
const schema = z.object({
  obra_id:      z.string().optional(),
  tipo_despesa: z.string().min(1, 'Selecione o tipo de despesa') as z.ZodType<TipoDespesa>,
  valor:        z.coerce.number({ invalid_type_error: 'Introduza um valor válido' }).positive('O valor deve ser positivo'),
  data_despesa: z.string().min(1, 'Informe a data'),
  descricao:    z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// Schema da mini-form de criação de obra
const obraSchema = z.object({
  codigo:  z.string().min(1, 'Código obrigatório'),
  nome:    z.string().min(1, 'Nome obrigatório'),
  cliente: z.string().min(1, 'Cliente obrigatório'),
});
type ObraFormData = z.infer<typeof obraSchema>;

interface DespesaModalProps {
  open:         boolean;
  onClose:      () => void;
  obras:        Obra[];
  onSubmit: (data: {
    obra_id?: string | null;
    tipo_despesa: TipoDespesa;
    valor: number;
    data_despesa: string;
    descricao?: string;
    ficheiros: ReciboFile[];
  }) => void;
  isSubmitting?:   boolean;
  tecnicoId?:      string;
  /** Quando definido, o modal abre em modo edição */
  initialDespesa?: Despesa;
}

export function DespesaModal({
  open, onClose, obras, onSubmit, isSubmitting, tecnicoId, initialDespesa,
}: DespesaModalProps) {
  const isEdit = !!initialDespesa;
  const [ficheiros,         setFicheiros]         = useState<ReciboFile[]>([]);
  const [showNovaObra,      setShowNovaObra]      = useState(false);
  const [obraAtual,         setObraAtual]         = useState<string>(OFICINA_VALUE);
  const [tipoAtual,         setTipoAtual]         = useState<string>('');
  const [recibosExistentes, setRecibosExistentes] = useState<ReciboDespesa[]>([]);
  const [removendoId,       setRemovendoId]       = useState<string | null>(null);
  const deleteRecibo = useDeleteRecibo();

  const today      = new Date().toISOString().split('T')[0];
  const createObra = useCreateObra();

  const {
    register, handleSubmit, setValue, reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Sincroniza form sempre que o modal abre ou muda a despesa
  useEffect(() => {
    if (open) {
      const obra = initialDespesa?.obra_id ?? OFICINA_VALUE;
      const tipo = initialDespesa?.tipo_despesa ?? '';
      setObraAtual(obra);
      setTipoAtual(tipo);
      setRecibosExistentes(initialDespesa?.recibos ?? []);
      setFicheiros([]);
      setShowNovaObra(false);
      reset({
        obra_id:      obra,
        tipo_despesa: initialDespesa?.tipo_despesa,
        valor:        initialDespesa?.valor,
        data_despesa: initialDespesa?.data_despesa ?? today,
        descricao:    initialDespesa?.descricao ?? '',
      });
    }
  }, [open, initialDespesa]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    register:       registerObra,
    handleSubmit:   handleSubmitObra,
    reset:          resetObra,
    formState: { errors: obraErrors },
  } = useForm<ObraFormData>({ resolver: zodResolver(obraSchema) });

  async function handleCriarObra(data: ObraFormData) {
    try {
      const nova = await createObra.mutateAsync({ ...data, created_by: tecnicoId });
      toast.success(`Obra "${nova.nome}" criada!`);
      // Seleciona a obra recém-criada automaticamente
      setValue('obra_id', nova.id, { shouldValidate: true });
      setObraAtual(nova.id);
      resetObra();
      setShowNovaObra(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar obra');
    }
  }

  function handleFormSubmit(data: FormData) {
    const obraId = data.obra_id === OFICINA_VALUE || !data.obra_id ? null : data.obra_id;
    onSubmit({
      ...data,
      obra_id:      obraId,
      tipo_despesa: data.tipo_despesa as TipoDespesa,
      descricao:    data.descricao || undefined,
      ficheiros,
    });
    reset({ data_despesa: today });
    setFicheiros([]);
    setObraAtual('');
    setShowNovaObra(false);
  }

  async function handleRemoverRecibo(recibo: ReciboDespesa) {
    setRemovendoId(recibo.id);
    try {
      await deleteRecibo.mutateAsync({ id: recibo.id, storagePath: recibo.storage_path });
      setRecibosExistentes((prev) => prev.filter((r) => r.id !== recibo.id));
    } catch {
      toast.error('Erro ao remover recibo');
    } finally {
      setRemovendoId(null);
    }
  }

  function handleClose() {
    setFicheiros([]);
    setObraAtual(OFICINA_VALUE);
    setTipoAtual('');
    setShowNovaObra(false);
    setRecibosExistentes([]);
    reset({});
    resetObra();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className={sDlg} showCloseButton={false}>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">
                {isEdit ? 'Editar Despesa' : 'Nova Despesa'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Preencha os dados da despesa</p>
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

            {/* Obra */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Lbl>Obra</Lbl>
                <button
                  type="button"
                  className="text-[10px] font-semibold text-accent-blue hover:underline"
                  onClick={() => setShowNovaObra((v) => !v)}
                >
                  {showNovaObra ? 'Cancelar' : '+ Nova obra'}
                </button>
              </div>

              {/* Mini-form criar obra */}
              {showNovaObra && (
                <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-3 space-y-2.5 mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent-blue">Criar nova obra</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 mb-1">Código</p>
                      <Input
                        placeholder="Ex: OB-042"
                        className="h-8 rounded-lg border-slate-200 bg-white text-xs shadow-none"
                        {...registerObra('codigo')}
                      />
                      {obraErrors.codigo && (
                        <p className="text-[10px] text-red-500 font-medium mt-0.5">{obraErrors.codigo.message}</p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 mb-1">Cliente</p>
                      <Input
                        placeholder="Nome do cliente"
                        className="h-8 rounded-lg border-slate-200 bg-white text-xs shadow-none"
                        {...registerObra('cliente')}
                      />
                      {obraErrors.cliente && (
                        <p className="text-[10px] text-red-500 font-medium mt-0.5">{obraErrors.cliente.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 mb-1">Nome da obra</p>
                    <Input
                      placeholder="Descrição da obra"
                      className="h-8 rounded-lg border-slate-200 bg-white text-xs shadow-none"
                      {...registerObra('nome')}
                    />
                    {obraErrors.nome && (
                      <p className="text-[10px] text-red-500 font-medium mt-0.5">{obraErrors.nome.message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={createObra.isPending}
                    onClick={handleSubmitObra(handleCriarObra)}
                    className="w-full flex items-center justify-center h-8 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 transition-colors disabled:opacity-60"
                  >
                    {createObra.isPending ? 'A criar...' : 'Criar obra'}
                  </button>
                </div>
              )}

              {/* Select obra */}
              <Select
                value={obraAtual}
                onValueChange={(v) => {
                  setObraAtual(v);
                  setValue('obra_id', v, { shouldValidate: true });
                }}
              >
                <SelectTrigger className={sTrigger}>
                  <SelectValue placeholder="Selecione ou deixe em branco (oficina)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OFICINA_VALUE}>
                    <div className="flex items-center gap-1.5">
                      <Wrench size={12} className="shrink-0 text-gray-400" />
                      <span>Oficina / Sem obra associada</span>
                    </div>
                  </SelectItem>
                  {obras
                    .filter((o) => o.status === 'ativa' || o.id === initialDespesa?.obra_id)
                    .map((obra) => (
                      <SelectItem key={obra.id} value={obra.id}>
                        {obra.codigo} — {obra.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Despesa */}
            <div>
              <Lbl>Tipo de Despesa</Lbl>
              <Select
                value={tipoAtual}
                onValueChange={(v) => {
                  setTipoAtual(v);
                  setValue('tipo_despesa', v as TipoDespesa, { shouldValidate: true });
                }}
              >
                <SelectTrigger className={errors.tipo_despesa ? sTriggerErr : sTrigger}>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DESPESA.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Err msg={errors.tipo_despesa?.message} />
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
                <input
                  type="date"
                  {...register('data_despesa')}
                  style={errors.data_despesa ? nativeFieldErr : nativeField}
                />
                <Err msg={errors.data_despesa?.message} />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <Lbl>Descrição (opcional)</Lbl>
              <Textarea
                {...register('descricao')}
                placeholder="Detalhes da despesa..."
                rows={2}
                className={sTextarea}
              />
            </div>

            {/* Recibos existentes (só no modo edição) */}
            {isEdit && (
              <div>
                <Lbl>
                  Recibos anexados
                  {recibosExistentes.length === 0 && (
                    <span className="ml-1 normal-case font-normal text-slate-400">(nenhum)</span>
                  )}
                </Lbl>
                {recibosExistentes.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {recibosExistentes.map((r) => (
                      <div key={r.id} className="group relative aspect-square rounded-lg border border-slate-200 overflow-hidden">
                        {r.tipo_ficheiro === 'imagem' ? (
                          <a href={r.url} target="_blank" rel="noopener noreferrer">
                            <img src={r.url} alt="Recibo" className="h-full w-full object-cover" />
                          </a>
                        ) : (
                          <a href={r.url} target="_blank" rel="noopener noreferrer"
                            className="flex h-full flex-col items-center justify-center gap-1 bg-red-50">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
                            </svg>
                            <span className="text-[9px] text-red-600 font-medium">PDF</span>
                          </a>
                        )}
                        {/* Botão remover */}
                        <button
                          type="button"
                          disabled={removendoId === r.id}
                          onClick={() => handleRemoverRecibo(r)}
                          className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-red-500/90 text-white shadow-sm hover:bg-red-600 disabled:opacity-60"
                          aria-label="Remover recibo"
                        >
                          {removendoId === r.id ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Novos recibos */}
            <div>
              <Lbl>{isEdit ? 'Adicionar novos recibos' : 'Recibos / Comprovativos'}</Lbl>
              <ReciboUpload
                files={ficheiros}
                onAdd={(f) => setFicheiros((prev) => [...prev, ...f])}
                onRemove={(i) => setFicheiros((prev) => prev.filter((_, idx) => idx !== i))}
              />
            </div>

          </div>

          {/* Footer */}
          <div className="flex gap-3 px-4 py-3.5 border-t border-slate-100 shrink-0 bg-white">
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
              {isSubmitting ? 'A guardar...' : isEdit
                ? (<>Guardar Alterações <IconArrow /></>)
                : (<>Guardar Despesa <IconArrow /></>)
              }
            </button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
