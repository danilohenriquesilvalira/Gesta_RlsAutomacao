'use client';

import React, { useState } from 'react';
import type { Despesa, DespesaStatus } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, X } from 'lucide-react';

interface DespesasTableProps {
  despesas: Despesa[];
  onAprovar?: (id: string) => void;
  onRejeitar?: (id: string) => void;
  showActions?: boolean;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getStatusBadge(status: DespesaStatus) {
  switch (status) {
    case 'pendente':
      return <Badge className="border-amber-200 bg-amber-50 text-amber-700 font-bold text-[10px]">Pendente</Badge>;
    case 'aprovada':
      return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-[10px]">Aprovada</Badge>;
    case 'rejeitada':
      return <Badge className="border-red-200 bg-red-50 text-red-700 font-bold text-[10px]">Rejeitada</Badge>;
  }
}

export function DespesasTable({
  despesas,
  onAprovar,
  onRejeitar,
  showActions = true,
}: DespesasTableProps) {
  const [viewDespesa, setViewDespesa] = useState<Despesa | null>(null);

  return (
    <>
      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-border hover:bg-transparent bg-gray-50/50">
              <TableHead className="text-gray-muted pl-6 h-10">Técnico</TableHead>
              <TableHead className="text-gray-muted text-center h-10">Obra</TableHead>
              <TableHead className="text-gray-muted text-center h-10">Tipo</TableHead>
              <TableHead className="text-gray-muted text-center h-10">Descrição</TableHead>
              <TableHead className="text-gray-muted text-center h-10">Valor</TableHead>
              <TableHead className="text-gray-muted text-center h-10">Data</TableHead>
              <TableHead className="text-gray-muted text-center h-10">Status</TableHead>
              {showActions && <TableHead className="text-right pr-6 h-10">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {despesas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showActions ? 8 : 7} className="py-10 text-center text-gray-muted">
                  Nenhuma despesa encontrada.
                </TableCell>
              </TableRow>
            ) : (
              despesas.map((despesa) => (
                <TableRow
                  key={despesa.id}
                  className="border-gray-border hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => setViewDespesa(despesa)}
                >
                  <TableCell className="pl-6 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {despesa.tecnico?.avatar_url ? (
                          <AvatarImage src={despesa.tecnico.avatar_url} alt={despesa.tecnico.full_name} />
                        ) : null}
                        <AvatarFallback className="bg-accent-blue/10 text-[9px] text-accent-blue font-bold">
                          {despesa.tecnico ? getInitials(despesa.tecnico.full_name) : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-bold text-navy truncate max-w-[120px]">
                        {despesa.tecnico?.full_name || 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-center text-gray-text px-2 max-w-[120px] truncate">
                    {despesa.obra?.nome || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-center text-gray-text px-2 capitalize">
                    {despesa.tipo_despesa}
                  </TableCell>
                  <TableCell className="text-sm text-center text-gray-text px-2 max-w-[140px] truncate">
                    {despesa.descricao || '—'}
                  </TableCell>
                  <TableCell className="text-sm font-bold text-navy text-center px-2">
                    {Number(despesa.valor).toFixed(2)} €
                  </TableCell>
                  <TableCell className="text-sm text-center text-gray-text px-2">
                    {formatDate(despesa.data_despesa)}
                  </TableCell>
                  <TableCell className="text-center px-2">
                    {getStatusBadge(despesa.status)}
                  </TableCell>
                  {showActions && (
                    <TableCell
                      className="text-right pr-4 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {/* Ver recibos — sempre visível */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="relative h-7 w-7 text-accent-blue hover:bg-accent-blue/10 rounded-full"
                          title={`Ver recibos (${despesa.recibos?.length ?? 0})`}
                          onClick={() => setViewDespesa(despesa)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          {(despesa.recibos?.length ?? 0) > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-blue text-[8px] text-white font-bold">
                              {despesa.recibos!.length}
                            </span>
                          )}
                        </Button>

                        {/* Aprovar / Rejeitar — só quando pendente */}
                        {despesa.status === 'pendente' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 rounded-full"
                              title="Aprovar"
                              onClick={() => onAprovar?.(despesa.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:bg-red-50 rounded-full"
                              title="Rejeitar"
                              onClick={() => onRejeitar?.(despesa.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog recibos */}
      <Dialog open={!!viewDespesa} onOpenChange={(o) => !o && setViewDespesa(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-navy font-bold">Recibos da Despesa</DialogTitle>
          </DialogHeader>
          {viewDespesa && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
                <p><span className="font-medium">Técnico:</span> {viewDespesa.tecnico?.full_name}</p>
                <p><span className="font-medium">Tipo:</span> <span className="capitalize">{viewDespesa.tipo_despesa}</span></p>
                <p><span className="font-medium">Obra:</span> {viewDespesa.obra?.nome}</p>
                <p><span className="font-medium">Valor:</span> {Number(viewDespesa.valor).toFixed(2)} €</p>
                <p><span className="font-medium">Data:</span> {formatDate(viewDespesa.data_despesa)}</p>
                {viewDespesa.descricao && (
                  <p><span className="font-medium">Descrição:</span> {viewDespesa.descricao}</p>
                )}
              </div>

              {(viewDespesa.recibos?.length ?? 0) === 0 ? (
                <p className="text-center text-gray-muted py-6">Sem recibos anexados</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {viewDespesa.recibos!.map((recibo) =>
                    recibo.tipo_ficheiro === 'imagem' ? (
                      <a key={recibo.id} href={recibo.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={recibo.url}
                          alt="Recibo"
                          className="w-full rounded-lg object-cover aspect-square border border-gray-border hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ) : (
                      <a
                        key={recibo.id}
                        href={recibo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center gap-2 aspect-square rounded-lg border border-gray-border bg-red-50 hover:bg-red-100 transition-colors p-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        </svg>
                        <span className="text-xs text-red-600 font-medium text-center">Abrir PDF</span>
                      </a>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
