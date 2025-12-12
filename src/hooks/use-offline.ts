import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingAction {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}

const STORAGE_KEY = 'mtran_offline_queue';
const CACHE_KEY = 'mtran_cached_data';

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending actions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setPendingActions(JSON.parse(stored));
    }
  }, []);

  // Save pending actions to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingActions));
  }, [pendingActions]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing data...');
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Changes will sync when connected.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add action to queue
  const queueAction = useCallback((action: Omit<PendingAction, 'id' | 'timestamp'>) => {
    const newAction: PendingAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setPendingActions(prev => [...prev, newAction]);
    return newAction.id;
  }, []);

  // Sync pending actions when online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const failedActions: PendingAction[] = [];

    for (const action of pendingActions) {
      try {
        // Use type assertion for dynamic table access
        const table = action.table as 'mpesa_transactions' | 'review_queue' | 'labeled_dataset';
        
        switch (action.type) {
          case 'insert':
            await supabase.from(table).insert(action.data as any);
            break;
          case 'update':
            await supabase.from(table).update(action.data as any).eq('id', action.data.id);
            break;
          case 'delete':
            await supabase.from(table).delete().eq('id', action.data.id);
            break;
        }
      } catch (error) {
        console.error('Sync failed for action:', action, error);
        failedActions.push(action);
      }
    }

    setPendingActions(failedActions);
    setIsSyncing(false);

    if (failedActions.length === 0) {
      toast.success('All changes synced successfully!');
    } else {
      toast.error(`${failedActions.length} actions failed to sync`);
    }
  }, [isOnline, pendingActions, isSyncing]);

  // Cache data for offline use
  const cacheData = useCallback((key: string, data: any) => {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[key] = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }, []);

  // Get cached data
  const getCachedData = useCallback((key: string, maxAge: number = 3600000) => {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const entry = cache[key];
    
    if (!entry) return null;
    
    // Check if cache is still valid
    if (Date.now() - entry.timestamp > maxAge) {
      return null;
    }
    
    return entry.data;
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    setPendingActions([]);
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingActions,
    pendingCount: pendingActions.length,
    queueAction,
    syncPendingActions,
    cacheData,
    getCachedData,
    clearCache,
  };
}
