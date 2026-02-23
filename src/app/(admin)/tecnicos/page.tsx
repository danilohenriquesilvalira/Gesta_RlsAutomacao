'use client';

import { useState } from 'react';
import { TecnicosTable } from '@/components/admin/TecnicosTable';
import type { TecnicoRow } from '@/components/admin/TecnicosTable';
import { ApontamentosTable } from '@/components/admin/ApontamentosTable';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { EditTecnicoModal } from '@/components/admin/EditTecnicoModal';
import { useTecnicosComHoras } from '@/lib/queries/tecnicos';
import { useApontamentos, useUpdateApontamentoStatus } from '@/lib/queries/apontamentos';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function TecnicosPage() {
  const { data: tecnicos = [] } = useTecnicosComHoras();
  const [selectedTecnico, setSelectedTecnico] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState<TecnicoRow | null>(null);
  const { data: tecnicoApts = [] } = useApontamentos(
    selectedTecnico ? { tecnicoId: selectedTecnico } : undefined
  );
  const updateStatus = useUpdateApontamentoStatus();

  const selectedProfile = tecnicos.find((t) => t.id === selectedTecnico);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">Técnicos</h1>
          <p className="text-gray-muted text-xs sm:text-sm">
            Acompanhe as horas dos técnicos de campo
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-navy hover:bg-navy-light text-white shrink-0 text-sm"
        >
          + Novo Técnico
        </Button>
      </div>

      <CreateUserModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <EditTecnicoModal
        open={!!editingTecnico}
        tecnico={editingTecnico}
        onClose={() => setEditingTecnico(null)}
      />

      <div className="rounded-xl border border-gray-border bg-white overflow-x-auto">
        <TecnicosTable
          tecnicos={tecnicos}
          onSelect={(id) => setSelectedTecnico(id)}
          onEdit={(tec) => setEditingTecnico(tec)}
        />
      </div>

      {/* Tecnico Detail Modal */}
      <Dialog
        open={!!selectedTecnico}
        onOpenChange={(o) => !o && setSelectedTecnico(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-navy">
              Apontamentos — {selectedProfile?.full_name}
            </DialogTitle>
          </DialogHeader>
          <ApontamentosTable
            apontamentos={tecnicoApts}
            onAprovar={(id) => updateStatus.mutate({ id, status: 'aprovado' })}
            onRejeitar={(id) => updateStatus.mutate({ id, status: 'rejeitado' })}
            showActions
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
