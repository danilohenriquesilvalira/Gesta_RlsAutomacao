'use client';

import { useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, X } from 'lucide-react';
import type { Profile } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  tecnicos: Profile[];
  defaultTecnicoId?: string;
  onSubmit: (data: {
    tecnico_id: string;
    periodo: string;
    valor_bruto: number;
    valor_liquido?: number | null;
    descricao?: string;
    file: File;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export function ReciboPagamentoModal({
  open, onClose, tecnicos, defaultTecnicoId, onSubmit, isSubmitting,
}: Props) {
  const [tecnicoId, setTecnicoId]       = useState(defaultTecnicoId ?? '');
  const [periodo, setPeriodo]           = useState('');
  const [valorBruto, setValorBruto]     = useState('');
  const [valorLiquido, setValorLiquido] = useState('');
  const [descricao, setDescricao]       = useState('');
  const [file, setFile]                 = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTecnicoId(defaultTecnicoId ?? '');
    setPeriodo('');
    setValorBruto('');
    setValorLiquido('');
    setDescricao('');
    setFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !tecnicoId || !periodo.trim() || !valorBruto) return;
    await onSubmit({
      tecnico_id: tecnicoId,
      periodo: periodo.trim(),
      valor_bruto: parseFloat(valorBruto),
      valor_liquido: valorLiquido ? parseFloat(valorLiquido) : null,
      descricao: descricao.trim() || undefined,
      file,
    });
    reset();
  }

  const canSubmit = !!file && !!tecnicoId && !!periodo.trim() && !!valorBruto;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy font-black text-[16px]">Carregar Recibo de Ordenado</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">

          {/* Funcionário — só quando não está pré-definido */}
          {!defaultTecnicoId && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Funcionário</Label>
              <Select value={tecnicoId} onValueChange={setTecnicoId}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Seleccionar funcionário..." />
                </SelectTrigger>
                <SelectContent>
                  {tecnicos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Período */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Período</Label>
            <Input
              placeholder="ex: Janeiro 2025"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              required
              className="h-9 text-[13px]"
            />
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Valor Bruto (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={valorBruto}
                onChange={(e) => setValorBruto(e.target.value)}
                required
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Valor Líquido (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="opcional"
                value={valorLiquido}
                onChange={(e) => setValorLiquido(e.target.value)}
                className="h-9 text-[13px]"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Notas (opcional)</Label>
            <textarea
              placeholder="Observações sobre este recibo..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-border px-3 py-2 text-[13px] text-gray-text placeholder:text-gray-muted/50 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30 resize-none transition-all"
            />
          </div>

          {/* Upload PDF */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-muted">Ficheiro PDF</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-2.5 p-3 rounded-lg border border-success/30 bg-success/5">
                <FileText size={16} className="text-success shrink-0" />
                <span className="text-[12px] text-navy font-semibold flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-gray-muted hover:text-error transition-colors shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 py-5 rounded-lg border-2 border-dashed border-gray-border hover:border-navy/30 hover:bg-gray-bg/50 transition-all"
              >
                <Upload size={20} className="text-gray-muted" />
                <span className="text-[12px] text-gray-muted font-medium">Clique para seleccionar o PDF</span>
              </button>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onClose(); }}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-navy hover:bg-navy-light text-white"
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? 'A guardar...' : 'Guardar Recibo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
