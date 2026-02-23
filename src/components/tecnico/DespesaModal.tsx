'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const schema = z.object({
  obra_id: z.string().optional(),
  tipo_despesa: z.string().min(1, 'Selecione o tipo de despesa') as z.ZodType<TipoDespesa>,
  valor: z.coerce.number({ invalid_type_error: 'Introduza um valor válido' }).positive('O valor deve ser positivo'),
  data_despesa: z.string().min(1, 'Informe a data'),
  descricao: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// Schema da mini-form de criação de obra
const obraSchema = z.object({
  codigo: z.string().min(1, 'Código obrigatório'),
  nome: z.string().min(1, 'Nome obrigatório'),
  cliente: z.string().min(1, 'Cliente obrigatório'),
});
type ObraFormData = z.infer<typeof obraSchema>;

interface DespesaModalProps {
  open: boolean;
  onClose: () => void;
  obras: Obra[];
  onSubmit: (data: {
    obra_id?: string | null;
    tipo_despesa: TipoDespesa;
    valor: number;
    data_despesa: string;
    descricao?: string;
    ficheiros: ReciboFile[];
  }) => void;
  isSubmitting?: boolean;
  tecnicoId?: string;
  /** Quando definido, o modal abre em modo edição */
  initialDespesa?: Despesa;
}

export function DespesaModal({
  open,
  onClose,
  obras,
  onSubmit,
  isSubmitting,
  tecnicoId,
  initialDespesa,
}: DespesaModalProps) {
  const isEdit = !!initialDespesa;
  const [ficheiros, setFicheiros] = useState<ReciboFile[]>([]);
  const [showNovaObra, setShowNovaObra] = useState(false);
  const [obraAtual, setObraAtual] = useState<string>(OFICINA_VALUE);
  const [tipoAtual, setTipoAtual] = useState<string>('');
  const [recibosExistentes, setRecibosExistentes] = useState<ReciboDespesa[]>([]);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const deleteRecibo = useDeleteRecibo();

  const today = new Date().toISOString().split('T')[0];
  const createObra = useCreateObra();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
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
        obra_id: obra,
        tipo_despesa: initialDespesa?.tipo_despesa,
        valor: initialDespesa?.valor,
        data_despesa: initialDespesa?.data_despesa ?? today,
        descricao: initialDespesa?.descricao ?? '',
      });
    }
  }, [open, initialDespesa]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    register: registerObra,
    handleSubmit: handleSubmitObra,
    reset: resetObra,
    formState: { errors: obraErrors },
  } = useForm<ObraFormData>({ resolver: zodResolver(obraSchema) });

  async function handleCriarObra(data: ObraFormData) {
    try {
      const nova = await createObra.mutateAsync({
        ...data,
        created_by: tecnicoId,
      });
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
    const obraId =
      data.obra_id === OFICINA_VALUE || !data.obra_id ? null : data.obra_id;
    onSubmit({
      ...data,
      obra_id: obraId,
      tipo_despesa: data.tipo_despesa as TipoDespesa,
      descricao: data.descricao || undefined,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-navy text-lg font-bold">
            {isEdit ? 'Editar Despesa' : 'Nova Despesa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Obra */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Obra</Label>
              <button
                type="button"
                className="text-xs text-accent-blue hover:underline"
                onClick={() => setShowNovaObra((v) => !v)}
              >
                {showNovaObra ? 'Cancelar' : '+ Nova obra'}
              </button>
            </div>

            {/* Mini-form criar obra */}
            {showNovaObra && (
              <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-3 space-y-3">
                <p className="text-xs font-semibold text-accent-blue">Criar nova obra</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Código</Label>
                    <Input
                      placeholder="Ex: OB-042"
                      className="h-8 text-sm"
                      {...registerObra('codigo')}
                    />
                    {obraErrors.codigo && (
                      <p className="text-[11px] text-error">{obraErrors.codigo.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cliente</Label>
                    <Input
                      placeholder="Nome do cliente"
                      className="h-8 text-sm"
                      {...registerObra('cliente')}
                    />
                    {obraErrors.cliente && (
                      <p className="text-[11px] text-error">{obraErrors.cliente.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nome da obra</Label>
                  <Input
                    placeholder="Descrição da obra"
                    className="h-8 text-sm"
                    {...registerObra('nome')}
                  />
                  {obraErrors.nome && (
                    <p className="text-[11px] text-error">{obraErrors.nome.message}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full bg-accent-blue text-white hover:bg-accent-blue/90"
                  disabled={createObra.isPending}
                  onClick={handleSubmitObra(handleCriarObra)}
                >
                  {createObra.isPending ? 'A criar...' : 'Criar obra'}
                </Button>
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
              <SelectTrigger>
                <SelectValue placeholder="Selecione ou deixe em branco (oficina)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OFICINA_VALUE}>
                  🏭 Oficina / Sem obra associada
                </SelectItem>
                {obras.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>
                    {obra.codigo} — {obra.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de despesa */}
          <div className="space-y-2">
            <Label>Tipo de Despesa</Label>
            <Select
              value={tipoAtual}
              onValueChange={(v) => {
                setTipoAtual(v);
                setValue('tipo_despesa', v as TipoDespesa, { shouldValidate: true });
              }}
            >
              <SelectTrigger>
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
            {errors.tipo_despesa && (
              <p className="text-sm text-error">{errors.tipo_despesa.message}</p>
            )}
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                {...register('valor')}
              />
              {errors.valor && (
                <p className="text-sm text-error">{errors.valor.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" {...register('data_despesa')} />
              {errors.data_despesa && (
                <p className="text-sm text-error">{errors.data_despesa.message}</p>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              {...register('descricao')}
              placeholder="Detalhes da despesa..."
              rows={2}
            />
          </div>

          {/* Recibos existentes (só no modo edição) */}
          {isEdit && (
            <div className="space-y-2">
              <Label>
                Recibos anexados
                {recibosExistentes.length === 0 && (
                  <span className="ml-1 text-xs font-normal text-gray-muted">(nenhum)</span>
                )}
              </Label>
              {recibosExistentes.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {recibosExistentes.map((r) => (
                    <div key={r.id} className="group relative aspect-square rounded-lg border border-gray-border overflow-hidden">
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
                        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-error/90 text-white shadow-sm hover:bg-error disabled:opacity-60"
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
          <div className="space-y-2">
            <Label>{isEdit ? 'Adicionar novos recibos' : 'Recibos / Comprovativos'}</Label>
            <ReciboUpload
              files={ficheiros}
              onAdd={(f) => setFicheiros((prev) => [...prev, ...f])}
              onRemove={(i) => setFicheiros((prev) => prev.filter((_, idx) => idx !== i))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-navy hover:bg-navy-light text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'A guardar...' : isEdit ? 'Guardar Alterações' : 'Guardar Despesa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
