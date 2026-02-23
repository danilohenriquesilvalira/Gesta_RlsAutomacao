'use client';

import { useState, useEffect } from 'react';
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

const schema = z.object({
    fullName: z.string().min(1, 'O nome é obrigatório').min(3, 'O nome deve ter pelo menos 3 caracteres'),
    email: z.string().min(1, 'O e-mail é obrigatório').email('Digite um e-mail válido'),
    password: z.string().min(1, 'A senha é obrigatória').min(6, 'A senha deve ter pelo menos 6 caracteres'),
    role: z.enum(['admin', 'tecnico'] as const, {
        required_error: 'Selecione o nível de acesso',
    }),
});

type FormData = z.infer<typeof schema>;

interface CreateUserModalProps {
    open: boolean;
    onClose: () => void;
}

export function CreateUserModal({ open, onClose }: CreateUserModalProps) {
    const createUser = useCreateUser();
    const [role, setRole] = useState<Role>('tecnico');

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            role: 'tecnico',
            fullName: '',
            email: '',
            password: '',
        },
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
            toast.success('Usuário criado com sucesso!');
            reset();
            onClose();
        } catch (error: any) {
            console.error('Create user error:', error);
            toast.error(error.message || 'Erro ao criar usuário');
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => {
            if (!o) {
                reset();
                onClose();
            }
        }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-navy font-bold">Novo Usuário</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleOnSubmit)} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Nome Completo</Label>
                        <Input
                            id="fullName"
                            placeholder="Ex: João Silva"
                            {...register('fullName')}
                            className={errors.fullName ? 'border-error' : ''}
                        />
                        {errors.fullName && (
                            <p className="text-xs text-error font-medium">{errors.fullName.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="tecnico@email.com"
                            {...register('email')}
                            className={errors.email ? 'border-error' : ''}
                        />
                        {errors.email && (
                            <p className="text-xs text-error font-medium">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Senha Inicial</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            {...register('password')}
                            className={errors.password ? 'border-error' : ''}
                        />
                        {errors.password && (
                            <p className="text-xs text-error font-medium">{errors.password.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de Usuário (Role)</Label>
                        <Select
                            defaultValue="tecnico"
                            onValueChange={(v) => {
                                setRole(v as Role);
                                setValue('role', v as Role, { shouldValidate: true });
                            }}
                        >
                            <SelectTrigger className={errors.role ? 'border-error' : ''}>
                                <SelectValue placeholder="Selecione o nível de acesso" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="tecnico">Técnico (Campo)</SelectItem>
                                <SelectItem value="admin">Administrador (Gestão)</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.role && (
                            <p className="text-xs text-error font-medium">{errors.role.message}</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={onClose}
                            disabled={createUser.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-navy hover:bg-navy-light text-white"
                            disabled={createUser.isPending}
                        >
                            {createUser.isPending ? 'Criando...' : 'Criar Usuário'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
