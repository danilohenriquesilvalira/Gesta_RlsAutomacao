'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getOfflineCount } from '@/lib/offline/indexeddb';
import { syncPendingEntries } from '@/lib/offline/sync';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getOfflineCount();
      setPendingCount(count);
    } catch {
      // ignore errors during count refresh
    }
  }, []);

  const sync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const synced = await syncPendingEntries();
      if (synced > 0) {
        await refreshCount();
      }
    } catch {
      // ignore sync errors
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isOnline, pendingCount, isSyncing, sync, refreshCount };
}
