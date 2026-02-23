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
import { useUpdateTecnico } from '@/lib/queries/tecnicos';
import { toast } from 'sonner';
import type { Role } from '@/types';
import type { TecnicoRow } from '@/components/admin/TecnicosTable';

const schema = z.object({
    fullName: z.string().min(1, 'O nome é obrigatório').min(3, 'O nome deve ter pelo menos 3 caracteres'),
    role: z.enum(['admin', 'tecnico'] as const, {
        required_error: 'Selecione o nível de acesso',
    }),
});

type FormData = z.infer<typeof schema>;

interface EditTecnicoModalProps {
    open: boolean;
    onClose: () => void;
    tecnico: TecnicoRow | null;
}

export function EditTecnicoModal({ open, onClose, tecnico }: EditTecnicoModalProps) {
    const updateTecnico = useUpdateTecnico();
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
        },
    });

    useEffect(() => {
        if (tecnico) {
            const r = (tecnico.role as Role) || 'tecnico';
            setRole(r);
            reset({ fullName: tecnico.full_name, role: r });
        }
    }, [tecnico, reset]);

    async function handleOnSubmit(data: FormData) {
        if (!tecnico) return;
        try {
            await updateTecnico.mutateAsync({
                id: tecnico.id,
                fullName: data.fullName,
                role: data.role,
            });
            toast.success('Técnico atualizado com sucesso!');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar técnico');
        }
    }

    function handleClose() {
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-navy font-bold">Editar Técnico</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleOnSubmit)} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-fullName">Nome Completo</Label>
                        <Input
                            id="edit-fullName"
                            placeholder="Ex: João Silva"
                            {...register('fullName')}
                            className={errors.fullName ? 'border-error' : ''}
                        />
                        {errors.fullName && (
                            <p className="text-xs text-error font-medium">{errors.fullName.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de Utilizador (Role)</Label>
                        <Select
                            value={role}
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
                            onClick={handleClose}
                            disabled={updateTecnico.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-navy hover:bg-navy-light text-white"
                            disabled={updateTecnico.isPending}
                        >
                            {updateTecnico.isPending ? 'A guardar...' : 'Guardar Alterações'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
