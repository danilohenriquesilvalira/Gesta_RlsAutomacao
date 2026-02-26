'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateUser } from '@/lib/queries/tecnicos';
import { toast } from 'sonner';
import type { Role } from '@/types';

// ─── Style constants ──────────────────────────────────────────────────────────
const sDlg       = 'flex flex-col w-[92vw] sm:w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 shadow-xl bg-white';
const sInput     = 'h-10 rounded-xl border-slate-200 bg-slate-50 text-sm shadow-none';
const sInputErr  = 'h-10 rounded-xl border-red-400 bg-red-50 text-sm shadow-none';
const sTrigger   = '!h-10 !py-0 rounded-xl border-slate-200 bg-slate-50 shadow-none text-sm';
const sTriggerErr= '!h-10 !py-0 rounded-xl border-red-400 bg-red-50 shadow-none text-sm';

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
  fullName: z.string().min(1, 'O nome é obrigatório').min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email:    z.string().min(1, 'O e-mail é obrigatório').email('Introduza um e-mail válido'),
  password: z.string().min(1, 'A palavra-passe é obrigatória').min(6, 'A palavra-passe deve ter pelo menos 6 caracteres'),
  role: z.enum(['admin', 'tecnico'] as const, {
    required_error: 'Selecione o nível de acesso',
  }),
});

type FormData = z.infer<typeof schema>;

interface CreateUserModalProps {
  open:    boolean;
  onClose: () => void;
}

export function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const createUser = useCreateUser();
  const [role, setRole] = useState<Role>('tecnico');

  const {
    register, handleSubmit, setValue, reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'tecnico', fullName: '', email: '', password: '' },
  });

  // Logging errors to console to help debug
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form errors:', errors);
    }
  }, [errors]);

  async function handleOnSubmit(data: FormData) {
    try {
      console.log('Attempting to create user:', data);
      await createUser.mutateAsync(data);
      toast.success('Utilizador criado com sucesso!');
      reset();
      onClose();
    } catch (error: any) {
      console.error('Create user error:', error);
      toast.error(error.message || 'Erro ao criar utilizador');
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className={sDlg} showCloseButton={false}>
        <form onSubmit={handleSubmit(handleOnSubmit)} className="flex flex-col flex-1 min-h-0">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">Novo Utilizador</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Preencha os dados de acesso</p>
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

            <div>
              <Lbl>Nome Completo</Lbl>
              <Input
                id="fullName"
                placeholder="Ex: João Silva"
                {...register('fullName')}
                className={errors.fullName ? sInputErr : sInput}
              />
              <Err msg={errors.fullName?.message} />
            </div>

            <div>
              <Lbl>E-mail</Lbl>
              <Input
                id="email"
                type="email"
                placeholder="tecnico@email.com"
                {...register('email')}
                className={errors.email ? sInputErr : sInput}
              />
              <Err msg={errors.email?.message} />
            </div>

            <div>
              <Lbl>Palavra-passe Inicial</Lbl>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? sInputErr : sInput}
              />
              <Err msg={errors.password?.message} />
            </div>

            <div>
              <Lbl>Tipo de Utilizador (Role)</Lbl>
              <Select
                defaultValue="tecnico"
                onValueChange={(v) => {
                  setRole(v as Role);
                  setValue('role', v as Role, { shouldValidate: true });
                }}
              >
                <SelectTrigger className={errors.role ? sTriggerErr : sTrigger}>
                  <SelectValue placeholder="Selecione o nível de acesso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tecnico">Funcionário (Campo)</SelectItem>
                  <SelectItem value="admin">Administrador (Gestão)</SelectItem>
                </SelectContent>
              </Select>
              <Err msg={errors.role?.message} />
            </div>

          </div>

          {/* Footer */}
          <div className="flex gap-3 px-4 py-3.5 border-t border-slate-100 shrink-0 bg-white">
            <button
              type="button"
              onClick={handleClose}
              disabled={createUser.isPending}
              className="flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-60"
            >
              <IconX /> Cancelar
            </button>
            <button
              type="submit"
              disabled={createUser.isPending}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-navy text-sm font-semibold text-white hover:bg-navy-light transition-colors shadow-sm shadow-navy/20 disabled:opacity-60"
            >
              {createUser.isPending ? 'A criar...' : (<>Criar Utilizador <IconArrow /></>)}
            </button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
