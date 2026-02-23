'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
      <div className="flex items-center justify-center gap-2 rounded-lg bg-success/15 px-4 py-2.5">
        {/* Spinner */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-spin text-success"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span className="text-sm font-medium text-success">
          Sincronizando...
        </span>
      </div>
    )
  }

  // Offline state or online with pending items
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg px-4 py-2.5',
        !isOnline ? 'bg-warning/15' : 'bg-warning/10'
      )}
    >
      <div className="flex items-center gap-2">
        {/* Offline / pending icon */}
        {!isOnline ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-warning"
          >
            <path d="M12.01 16.5h.005" />
            <path d="M16.874 7.117a7.963 7.963 0 0 0-2.855-1.679" />
            <path d="M20.465 3.535a12.97 12.97 0 0 0-5.401-2.96" />
            <path d="M2 2l20 20" />
            <path d="M8.476 5.478a7.96 7.96 0 0 0-3.352 1.64" />
            <path d="M5.124 7.117a7.963 7.963 0 0 0-1.686 2.062" />
            <path d="M8.644 10.352a5 5 0 0 1 5.757-.353" />
            <path d="M3.535 3.535a12.971 12.971 0 0 0-2.96 5.401" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-warning"
          >
            <path d="M12 16v5" />
            <path d="M16 14v7" />
            <path d="M20 10v11" />
            <path d="M4 20v-2" />
            <path d="M8 18v4" />
          </svg>
        )}

        <span className="text-sm font-medium text-warning">
          {!isOnline
            ? `Sem conexao - ${pendingCount} ${pendingCount === 1 ? 'apontamento pendente' : 'apontamentos pendentes'}`
            : `${pendingCount} ${pendingCount === 1 ? 'apontamento pendente' : 'apontamentos pendentes'}`}
        </span>
      </div>

      {/* Sync button (only shown when online with pending) */}
      {isOnline && pendingCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSync}
          className="h-7 gap-1 px-2 text-xs font-semibold text-warning hover:bg-warning/15 hover:text-warning"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          Sincronizar
        </Button>
      )}
    </div>
  )
}
