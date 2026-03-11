'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react'

interface OfflineBannerProps {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  onSync: () => void
}

export function OfflineBanner({
  isOnline,
  pendingCount,
  isSyncing,
  onSync,
}: OfflineBannerProps) {
  // Hidden when online and no pending items
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null
  }

  // Syncing state
  if (isSyncing) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 mb-4">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
        <span className="text-sm font-bold text-emerald-700 uppercase tracking-tight">
          A sincronizar os seus registos...
        </span>
      </div>
    )
  }

  // Offline state or online with pending items
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl px-4 py-2.5 mb-4 border shadow-sm transition-all',
        !isOnline
          ? 'bg-amber-50 border-amber-200'
          : 'bg-emerald-50 border-emerald-200'
      )}
    >
      <div className="flex items-center gap-2.5">
        {!isOnline ? (
          <WifiOff className="w-4 h-4 text-amber-600" />
        ) : (
          <AlertCircle className="w-4 h-4 text-emerald-600" />
        )}

        <div className="flex flex-col">
          <span className={cn(
            "text-xs font-black uppercase tracking-tight",
            !isOnline ? "text-amber-800" : "text-emerald-800"
          )}>
            {!isOnline ? 'Modo Offline' : 'Ligações Pendentes'}
          </span>
          <span className={cn(
            "text-[10px] font-medium leading-tight",
            !isOnline ? "text-amber-600" : "text-emerald-600"
          )}>
            {!isOnline
              ? `Sem ligação à internet - ${pendingCount} ${pendingCount === 1 ? 'registo guardado localmente' : 'registos guardados localmente'}`
              : `Tem ${pendingCount} ${pendingCount === 1 ? 'registo pronto' : 'registos prontos'} para ser enviado`}
          </span>
        </div>
      </div>

      {/* Sync button (only shown when online with pending) */}
      {isOnline && pendingCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          className="h-8 gap-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-tighter border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Sincronizar Agora
        </Button>
      )}
    </div>
  )
}
