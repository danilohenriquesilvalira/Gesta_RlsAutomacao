'use client';

import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { cn } from '@/lib/utils';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Bloco extra de informação (ex: nome da obra a eliminar) */
  details?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'default';
}

const overlayAnim =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200';

const contentAnim =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  isLoading,
  variant = 'danger',
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const iconBg = isDanger
    ? 'bg-red-50 border-red-100'
    : isWarning
    ? 'bg-amber-50 border-amber-100'
    : 'bg-slate-50 border-slate-200';

  const iconColor = isDanger
    ? 'text-red-600'
    : isWarning
    ? 'text-amber-600'
    : 'text-slate-600';

  const confirmBg = isDanger
    ? 'bg-red-600 hover:bg-red-700'
    : isWarning
    ? 'bg-amber-600 hover:bg-amber-700'
    : 'bg-navy hover:bg-navy-light';

  const Icon = isDanger ? Trash2 : AlertTriangle;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn('fixed inset-0 z-50 bg-black/40', overlayAnim)}
        />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-full max-w-[calc(100%-2rem)] sm:max-w-[380px]',
            'bg-white rounded-xl border border-slate-200 shadow-xl',
            'p-0 overflow-hidden outline-none',
            contentAnim
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-3.5 px-5 pt-5 pb-4">
            <div
              className={cn(
                'shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border',
                iconBg
              )}
            >
              <Icon className={cn('w-4 h-4', iconColor)} />
            </div>
            <div className="flex-1 pt-0.5 min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 leading-tight">
                {title}
              </h2>
              <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                {description}
              </p>
              {details && <div className="mt-3">{details}</div>}
            </div>
            <Dialog.Close
              className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors -mt-0.5"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 mx-5" />

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3.5">
            <Dialog.Close asChild>
              <button
                className="h-8 px-4 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                'h-8 px-4 rounded-lg text-[13px] font-semibold text-white transition-colors disabled:opacity-60',
                confirmBg
              )}
            >
              {isLoading ? 'A processar...' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
