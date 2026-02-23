'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApontamentos } from '@/lib/queries/apontamentos';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function FotosPage() {
  const { profile } = useAuth();
  const { data: apontamentos = [] } = useApontamentos(
    profile ? { tecnicoId: profile.id } : undefined
  );
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const allFotos = apontamentos.flatMap(
    (apt) =>
      apt.fotos?.map((f) => ({
        ...f,
        obra_codigo: apt.obra?.codigo ?? '',
        tipo_servico: apt.tipo_servico,
        data: apt.data_apontamento,
      })) ?? []
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Minhas Fotos</h1>
        <p className="text-sm text-gray-muted">
          {allFotos.length} foto{allFotos.length !== 1 ? 's' : ''} registrada{allFotos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {allFotos.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-gray-border mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-gray-muted">Nenhuma foto ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
          {allFotos.map((foto) => (
            <div
              key={foto.id}
              className="relative rounded-xl overflow-hidden bg-white border border-gray-border cursor-pointer"
              onClick={() => setSelectedPhoto(foto.url)}
            >
              <img
                src={foto.url}
                alt="Foto do serviço"
                className="w-full aspect-square object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs font-semibold">
                  {foto.obra_codigo}
                </p>
                <p className="text-white/80 text-xs">{foto.tipo_servico}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
      >
        <DialogContent className="max-w-lg p-2">
          <DialogHeader>
            <DialogTitle className="sr-only">Foto</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Foto ampliada"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
