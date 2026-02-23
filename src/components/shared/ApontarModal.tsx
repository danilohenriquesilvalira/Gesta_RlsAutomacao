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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-navy text-lg font-bold">
            Apontar Horas
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Obra</Label>
            <Select onValueChange={(v) => setValue('obra_id', v, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a obra" />
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
              <p className="text-sm text-error">{errors.obra_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo de Serviço</Label>
            <Select onValueChange={(v) => setValue('tipo_servico', v, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
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
              <p className="text-sm text-error">{errors.tipo_servico.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hora Entrada</Label>
              <Input type="time" {...register('hora_entrada')} />
              {errors.hora_entrada && (
                <p className="text-sm text-error">{errors.hora_entrada.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Hora Saída</Label>
              <Input type="time" {...register('hora_saida')} />
              {errors.hora_saida && (
                <p className="text-sm text-error">{errors.hora_saida.message}</p>
              )}
            </div>
          </div>

          {totalHoras !== null && (
            <div className="bg-gray-bg rounded-lg px-4 py-2 text-center">
              <span className="text-sm text-gray-muted">Total: </span>
              <span className="text-lg font-bold text-navy">
                {totalHoras.toFixed(2)}h
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de Hora</Label>
            <HoraTypeSelector value={tipoHora} onChange={setTipoHora} />
          </div>

          <div className="space-y-2">
            <Label>Descrição do Serviço</Label>
            <Textarea
              {...register('descricao')}
              placeholder="Descreva o serviço realizado..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Fotos</Label>
            <CameraCapture
              photos={photos}
              onCapture={handleCapture}
              onRemove={removePhoto}
              inputRef={inputRef}
              isProcessing={isProcessing}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-navy hover:bg-navy-light text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Apontamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
