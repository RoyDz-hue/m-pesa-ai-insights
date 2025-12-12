import React, { createContext, useContext, ReactNode } from 'react';
import { useOfflineMode } from '@/hooks/use-offline';
import { useBackgroundSync } from '@/hooks/use-background-sync';

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  queueAction: (action: { type: 'insert' | 'update' | 'delete'; table: string; data: any }) => string;
  syncPendingActions: () => Promise<void>;
  cacheData: (key: string, data: any) => void;
  getCachedData: (key: string, maxAge?: number) => any;
  clearCache: () => void;
  syncDashboardStats: () => Promise<any>;
  syncRecentTransactions: (limit?: number) => Promise<any>;
  syncReviewQueue: () => Promise<any>;
  performFullSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const offlineMode = useOfflineMode();
  const backgroundSync = useBackgroundSync({
    syncInterval: 30000,
    enableRealtime: true,
  });

  const value: OfflineContextValue = {
    ...offlineMode,
    ...backgroundSync,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
