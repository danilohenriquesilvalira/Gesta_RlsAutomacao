'use client';

import { useState } from 'react';
import { ObrasGrid } from '@/components/admin/ObrasGrid';
import { useObras, useCreateObra, useUpdateObra, useDeleteObra } from '@/lib/queries/obras';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Obra, ObraStatus } from '@/types';

export default function ObrasPage() {
  const { data: obras = [] } = useObras();
  const { profile } = useAuth();
  const createObra = useCreateObra();
  const updateObra = useUpdateObra();
  const deleteObra = useDeleteObra();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingObra, setEditingObra] = useState<Obra | null>(null);
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    cliente: '',
    prazo: '',
    status: 'ativa' as ObraStatus,
    progresso: 0,
  });

  function openCreate() {
    setEditingObra(null);
    setForm({ codigo: '', nome: '', cliente: '', prazo: '', status: 'ativa', progresso: 0 });
    setModalOpen(true);
  }

  function openEdit(obra: Obra) {
    setEditingObra(obra);
    setForm({
      codigo: obra.codigo,
      nome: obra.nome,
      cliente: obra.cliente,
      prazo: obra.prazo ?? '',
      status: obra.status,
      progresso: obra.progresso,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (editingObra) {
      await updateObra.mutateAsync({
        id: editingObra.id,
        codigo: form.codigo,
        nome: form.nome,
        cliente: form.cliente,
        prazo: form.prazo || null,
        status: form.status,
        progresso: form.progresso,
      });
    } else {
      await createObra.mutateAsync({
        codigo: form.codigo,
        nome: form.nome,
        cliente: form.cliente,
        prazo: form.prazo || undefined,
        created_by: profile?.id,
      });
    }
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja excluir esta obra?')) {
      await deleteObra.mutateAsync(id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">Obras</h1>
          <p className="text-gray-muted text-xs sm:text-sm">
            Gerencie os projetos e obras
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-navy hover:bg-navy-light text-white shrink-0 text-sm"
        >
          + Nova Obra
        </Button>
      </div>

      <ObrasGrid obras={obras} onEdit={openEdit} onDelete={handleDelete} />

      {/* Modal Create/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-navy">
              {editingObra ? 'Editar Obra' : 'Nova Obra'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
                  placeholder="SE-07"
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={form.prazo}
                  onChange={(e) => setForm((p) => ({ ...p, prazo: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Subestação Manaus"
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                value={form.cliente}
                onChange={(e) => setForm((p) => ({ ...p, cliente: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
            {editingObra && (
              <>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((p) => ({ ...p, status: v as ObraStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Progresso ({form.progresso}%)</Label>
                  <Input
                    type="range"
                    min={0}
                    max={100}
                    value={form.progresso}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, progresso: parseInt(e.target.value) }))
                    }
                  />
                </div>
              </>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-navy hover:bg-navy-light text-white"
                onClick={handleSave}
                disabled={createObra.isPending || updateObra.isPending}
              >
                {createObra.isPending || updateObra.isPending
                  ? 'Salvando...'
                  : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
