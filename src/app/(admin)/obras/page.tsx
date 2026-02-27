'use client';

import { useState } from 'react';
import { ObrasGrid } from '@/components/admin/ObrasGrid';
import { useObras, useCreateObra, useUpdateObra, useDeleteObra } from '@/lib/queries/obras';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Obra, ObraStatus } from '@/types';

// ─── Style constants ──────────────────────────────────────────────────────────
const sDlg     = 'flex flex-col w-[92vw] sm:w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 shadow-xl bg-white';
const sInput   = 'h-10 rounded-xl border-slate-200 bg-slate-50 text-sm shadow-none';
const sTrigger = '!h-10 !py-0 rounded-xl border-slate-200 bg-slate-50 shadow-none text-sm';

// ─── Icons ─────────────────────────────────────────────────────────────────────
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

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{children}</p>
);

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
    orcamento: '',
    status: 'ativa' as ObraStatus,
    progresso: 0,
  });

  function openCreate() {
    setEditingObra(null);
    setForm({ codigo: '', nome: '', cliente: '', prazo: '', orcamento: '', status: 'ativa', progresso: 0 });
    setModalOpen(true);
  }

  function openEdit(obra: Obra) {
    setEditingObra(obra);
    setForm({
      codigo: obra.codigo,
      nome: obra.nome,
      cliente: obra.cliente,
      prazo: obra.prazo ?? '',
      orcamento: obra.orcamento != null ? String(obra.orcamento) : '',
      status: obra.status,
      progresso: obra.progresso,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const orcamentoVal = form.orcamento ? parseFloat(form.orcamento) : null;
    if (editingObra) {
      await updateObra.mutateAsync({
        id: editingObra.id,
        codigo: form.codigo,
        nome: form.nome,
        cliente: form.cliente,
        prazo: form.prazo || null,
        orcamento: orcamentoVal,
        status: form.status,
        progresso: form.progresso,
      });
    } else {
      await createObra.mutateAsync({
        codigo: form.codigo,
        nome: form.nome,
        cliente: form.cliente,
        prazo: form.prazo || undefined,
        orcamento: orcamentoVal,
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
      <PageHeader
        title="Obras"
        subtitle="Gerencie os projetos e obras"
        actions={
          <Button onClick={openCreate} className="bg-navy hover:bg-navy-light text-white shrink-0 text-sm">
            + Nova Obra
          </Button>
        }
      />

      <ObrasGrid obras={obras} onEdit={openEdit} onDelete={handleDelete} />

      {/* Modal Create/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className={sDlg} showCloseButton={false}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">
                {editingObra ? 'Editar Obra' : 'Nova Obra'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Preencha os dados da obra</p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
            >
              <IconClose />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-3">

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <Lbl>Código</Lbl>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
                  placeholder="SE-07"
                  className={sInput}
                />
              </div>
              <div className="min-w-0">
                <Lbl>Prazo</Lbl>
                <Input
                  type="date"
                  value={form.prazo}
                  onChange={(e) => setForm((p) => ({ ...p, prazo: e.target.value }))}
                  className={sInput}
                />
              </div>
            </div>

            <div>
              <Lbl>Nome</Lbl>
              <Input
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Subestação Manaus"
                className={sInput}
              />
            </div>

            <div>
              <Lbl>Orçamento (€)</Lbl>
              <Input
                type="number"
                value={form.orcamento}
                onChange={(e) => setForm((p) => ({ ...p, orcamento: e.target.value }))}
                placeholder="0.00"
                min={0}
                step={0.01}
                className={sInput}
              />
            </div>

            <div>
              <Lbl>Cliente</Lbl>
              <Input
                value={form.cliente}
                onChange={(e) => setForm((p) => ({ ...p, cliente: e.target.value }))}
                placeholder="Nome do cliente"
                className={sInput}
              />
            </div>

            {editingObra && (
              <>
                <div>
                  <Lbl>Status</Lbl>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((p) => ({ ...p, status: v as ObraStatus }))}
                  >
                    <SelectTrigger className={sTrigger}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Lbl>Progresso ({form.progresso}%)</Lbl>
                  <Input
                    type="range"
                    min={0}
                    max={100}
                    value={form.progresso}
                    onChange={(e) => setForm((p) => ({ ...p, progresso: parseInt(e.target.value) }))}
                    className="h-10 w-full cursor-pointer"
                  />
                </div>
              </>
            )}

          </div>

          {/* Footer */}
          <div className="flex gap-3 px-4 py-3.5 border-t border-slate-100 shrink-0 bg-white">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <IconX /> Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createObra.isPending || updateObra.isPending}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-navy text-sm font-semibold text-white hover:bg-navy-light transition-colors shadow-sm shadow-navy/20 disabled:opacity-60"
            >
              {createObra.isPending || updateObra.isPending
                ? 'A guardar...'
                : (<>{editingObra ? 'Guardar Alterações' : 'Criar Obra'} <IconArrow /></>)
              }
            </button>
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}
