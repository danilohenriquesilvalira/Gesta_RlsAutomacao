'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ReciboFile {
  base64: string;
  tipo: 'imagem' | 'pdf';
  nome: string;
  preview?: string; // data URL for images
}

interface ReciboUploadProps {
  files: ReciboFile[];
  onAdd: (files: ReciboFile[]) => void;
  onRemove: (index: number) => void;
  isProcessing?: boolean;
}

export function ReciboUpload({ files, onAdd, onRemove, isProcessing = false }: ReciboUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (!selectedFiles.length) return;
    setProcessing(true);

    const newFiles: ReciboFile[] = [];
    for (const file of selectedFiles) {
      const isPdf = file.type === 'application/pdf';
      const base64 = await toBase64(file);
      newFiles.push({
        base64,
        tipo: isPdf ? 'pdf' : 'imagem',
        nome: file.name,
        preview: isPdf ? undefined : base64,
      });
    }

    onAdd(newFiles);
    setProcessing(false);
    // Reset so same file can be picked again
    if (inputRef.current) inputRef.current.value = '';
  }

  function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const busy = isProcessing || processing;

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Upload button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={cn(
          'flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-border text-gray-text transition-colors hover:border-accent-blue hover:text-accent-blue',
          busy && 'cursor-not-allowed opacity-60'
        )}
      >
        {busy ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="text-sm font-medium">Processando...</span>
          </>
        ) : (
          <>
            {/* Upload icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <span className="text-sm font-medium">Foto / PDF</span>
          </>
        )}
      </Button>

      {/* File previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="group relative aspect-square overflow-hidden rounded-lg border border-gray-border"
            >
              {file.tipo === 'imagem' && file.preview ? (
                <img
                  src={file.preview}
                  alt={`Recibo ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                /* PDF placeholder */
                <div className="flex h-full flex-col items-center justify-center gap-1 bg-red-50 px-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M10 9H8" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                  </svg>
                  <span className="text-[9px] text-red-600 font-medium text-center break-all leading-tight line-clamp-2">
                    {file.nome}
                  </span>
                </div>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-error/90 text-white shadow-sm transition-opacity hover:bg-error"
                aria-label={`Remover ficheiro ${index + 1}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <p className="text-center text-xs text-gray-muted">
          {files.length} {files.length === 1 ? 'ficheiro anexado' : 'ficheiros anexados'}
        </p>
      )}
    </div>
  );
}
