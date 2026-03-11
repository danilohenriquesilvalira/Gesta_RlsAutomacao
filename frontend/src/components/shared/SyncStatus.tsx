'use client';

interface SyncStatusProps {
  pendingCount: number;
  isSyncing: boolean;
}

export function SyncStatus({ pendingCount, isSyncing }: SyncStatusProps) {
  if (pendingCount === 0 && !isSyncing) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {isSyncing ? (
        <>
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
          <span className="text-accent-blue font-medium">Sincronizando...</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-warning font-medium">
            {pendingCount} offline
          </span>
        </>
      )}
    </div>
  );
}
