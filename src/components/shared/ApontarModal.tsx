'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { HoraTypeSelector } from './HoraTypeSelector';
import { CameraCapture } from '@/components/tecnico/CameraCapture';
import { useCamera } from '@/hooks/useCamera';
import { calcTotalHoras } from '@/lib/utils/calcHoras';
import { TIPOS_SERVICO, type TipoHora } from '@/types';
import type { Obra } from '@/types';

const schema = z.object({
  obra_id: z.string().min(1, 'Selecione a obra'),
  tipo_servico: z.string().min(1, 'Selecione o tipo de serviço'),
  hora_entrada: z.string().min(1, 'Informe a hora de entrada'),
  hora_saida: z.string().min(1, 'Informe a hora de saída'),
  descricao: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ApontarModalProps {
  open: boolean;
  onClose: () => void;
  obras: Obra[];
  onSubmit: (data: {
    obra_id: string;
    tipo_servico: string;
    tipo_hora: TipoHora;
    hora_entrada: string;
    hora_saida: string;
    total_horas: number;
    descricao?: string;
    fotos_base64: string[];
  }) => void;
  isSubmitting?: boolean;
}

export function ApontarModal({
  open,
  onClose,
  obras,
  onSubmit,
  isSubmitting,
}: ApontarModalProps) {
  const [tipoHora, setTipoHora] = useState<TipoHora>('normal');
  const { inputRef, photos, isProcessing, handleCapture, removePhoto, clearPhotos } = useCamera();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const horaEntrada = watch('hora_entrada');
  const horaSaida = watch('hora_saida');
  const totalHoras =
    horaEntrada && horaSaida ? calcTotalHoras(horaEntrada, horaSaida) : null;

  function handleFormSubmit(data: FormData) {
    const total = calcTotalHoras(data.hora_entrada, data.hora_saida);
    onSubmit({
      ...data,
      tipo_hora: tipoHora,
      total_horas: total,
      descricao: data.descricao || undefined,
      fotos_base64: photos,
    });
    reset();
    clearPhotos();
    setTipoHora('normal');
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        reset();
        clearPhotos();
        onClose();
      }
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-navy text-lg font-black uppercase tracking-wider">
            Registo de Horas
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-gray-muted">Obra</Label>
            <Select onValueChange={(v) => setValue('obra_id', v, { shouldValidate: true })}>
              <SelectTrigger className="rounded-xl border-gray-border h-11">
                <SelectValue placeholder="Selecione a obra de destino" />
              </SelectTrigger>
              <SelectContent>
                {obras
                  .filter((o) => o.status === 'ativa')
                  .map((obra) => (
                    <SelectItem key={obra.id} value={obra.id}>
                      {obra.codigo} — {obra.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.obra_id && (
              <p className="text-xs text-error font-medium">{errors.obra_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-gray-muted">Tipo de Serviço</Label>
            <Select onValueChange={(v) => setValue('tipo_servico', v, { shouldValidate: true })}>
              <SelectTrigger className="rounded-xl border-gray-border h-11">
                <SelectValue placeholder="Que tipo de trabalho realizou?" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_SERVICO.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo_servico && (
              <p className="text-xs text-error font-medium">{errors.tipo_servico.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-gray-muted">Hora de Entrada</Label>
              <Input type="time" {...register('hora_entrada')} className="rounded-xl border-gray-border h-11" />
              {errors.hora_entrada && (
                <p className="text-xs text-error font-medium">{errors.hora_entrada.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-gray-muted">Hora de Saída</Label>
              <Input type="time" {...register('hora_saida')} className="rounded-xl border-gray-border h-11" />
              {errors.hora_saida && (
                <p className="text-xs text-error font-medium">{errors.hora_saida.message}</p>
              )}
            </div>
          </div>

          {totalHoras !== null && (
            <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
              <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total Calculado: </span>
              <span className="text-xl font-black text-emerald-700 ml-1">
                {totalHoras.toFixed(2)}h
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-gray-muted">Classificação</Label>
            <HoraTypeSelector value={tipoHora} onChange={setTipoHora} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-gray-muted">Descrição (Opcional)</Label>
            <Textarea
              {...register('descricao')}
              placeholder="Detalhes sobre o serviço..."
              rows={3}
              className="rounded-xl border-gray-border resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-gray-muted">Evidências (Fotos)</Label>
            <CameraCapture
              photos={photos}
              onCapture={handleCapture}
              onRemove={removePhoto}
              inputRef={inputRef}
              isProcessing={isProcessing}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl h-12 font-bold text-gray-muted"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-navy hover:bg-navy-light text-white rounded-xl h-12 font-bold shadow-lg shadow-navy/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'A guardar...' : 'Confirmar Registo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
