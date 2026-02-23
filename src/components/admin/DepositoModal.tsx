'use client';

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
import type { Profile } from '@/types';

const schema = z.object({
  tecnico_id: z.string().min(1, 'Selecione o técnico'),
  valor: z.coerce.number({ invalid_type_error: 'Introduza um valor válido' }).positive('O valor deve ser positivo'),
  data_deposito: z.string().min(1, 'Informe a data'),
  descricao: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface DepositoModalProps {
  open: boolean;
  onClose: () => void;
  tecnicos: Profile[];
  onSubmit: (data: {
    tecnico_id: string;
    valor: number;
    data_deposito: string;
    descricao?: string;
  }) => void;
  isSubmitting?: boolean;
}

export function DepositoModal({
  open,
  onClose,
  tecnicos,
  onSubmit,
  isSubmitting,
}: DepositoModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { data_deposito: today },
  });

  function handleFormSubmit(data: FormData) {
    onSubmit({
      ...data,
      descricao: data.descricao || undefined,
    });
    reset({ data_deposito: today });
  }

  function handleClose() {
    reset({ data_deposito: today });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy font-bold">Registar Depósito</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          {/* Técnico */}
          <div className="space-y-2">
            <Label>Técnico</Label>
            <Select onValueChange={(v) => setValue('tecnico_id', v, { shouldValidate: true })}>
              <SelectTrigger className={errors.tecnico_id ? 'border-error' : ''}>
                <SelectValue placeholder="Selecione o técnico" />
              </SelectTrigger>
              <SelectContent>
                {tecnicos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tecnico_id && (
              <p className="text-xs text-error font-medium">{errors.tecnico_id.message}</p>
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
                className={errors.valor ? 'border-error' : ''}
              />
              {errors.valor && (
                <p className="text-xs text-error font-medium">{errors.valor.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                {...register('data_deposito')}
                className={errors.data_deposito ? 'border-error' : ''}
              />
              {errors.data_deposito && (
                <p className="text-xs text-error font-medium">{errors.data_deposito.message}</p>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              {...register('descricao')}
              placeholder="Ex: Adiantamento mês de Fevereiro..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-navy hover:bg-navy-light text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'A registar...' : 'Registar Depósito'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
