import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineMode } from './use-offline';
import { toast } from 'sonner';

interface BackgroundSyncOptions {
  syncInterval?: number; // in milliseconds
  enableRealtime?: boolean;
  onNewTransaction?: (transaction: any) => void;
}

export function useBackgroundSync(options: BackgroundSyncOptions = {}) {
  const {
    syncInterval = 30000, // 30 seconds default
    enableRealtime = true,
    onNewTransaction,
  } = options;

  const { isOnline, cacheData, getCachedData } = useOfflineMode();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);

  // Fetch and cache dashboard stats
  const syncDashboardStats = useCallback(async () => {
    if (!isOnline) return getCachedData('dashboard_stats');

    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [todayResult, monthResult, countResult] = await Promise.all([
        supabase
          .from('mpesa_transactions')
          .select('amount')
          .gte('created_at', startOfDay)
          .not('amount', 'is', null),
        supabase
          .from('mpesa_transactions')
          .select('amount')
          .gte('created_at', startOfMonth)
          .not('amount', 'is', null),
        supabase
          .from('mpesa_transactions')
          .select('id', { count: 'exact', head: true }),
      ]);

      const stats = {
        todayTotal: todayResult.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        monthTotal: monthResult.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        transactionCount: countResult.count || 0,
        lastSync: Date.now(),
      };

      cacheData('dashboard_stats', stats);
      lastSyncRef.current = Date.now();
      return stats;
    } catch (error) {
      console.error('Failed to sync dashboard stats:', error);
      return getCachedData('dashboard_stats');
    }
  }, [isOnline, cacheData, getCachedData]);

  // Fetch and cache recent transactions
  const syncRecentTransactions = useCallback(async (limit: number = 50) => {
    if (!isOnline) return getCachedData('recent_transactions');

    try {
      const { data, error } = await supabase
        .from('mpesa_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      cacheData('recent_transactions', data);
      return data;
    } catch (error) {
      console.error('Failed to sync recent transactions:', error);
      return getCachedData('recent_transactions');
    }
  }, [isOnline, cacheData, getCachedData]);

  // Sync review queue
  const syncReviewQueue = useCallback(async () => {
    if (!isOnline) return getCachedData('review_queue');

    try {
      const { data, error } = await supabase
        .from('review_queue')
        .select(`
          *,
          mpesa_transactions (*)
        `)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      cacheData('review_queue', data);
      return data;
    } catch (error) {
      console.error('Failed to sync review queue:', error);
      return getCachedData('review_queue');
    }
  }, [isOnline, cacheData, getCachedData]);

  // Full sync
  const performFullSync = useCallback(async () => {
    await Promise.all([
      syncDashboardStats(),
      syncRecentTransactions(),
      syncReviewQueue(),
    ]);
  }, [syncDashboardStats, syncRecentTransactions, syncReviewQueue]);

  // Setup periodic sync
  useEffect(() => {
    if (isOnline) {
      // Initial sync
      performFullSync();

      // Setup interval
      syncIntervalRef.current = setInterval(() => {
        performFullSync();
      }, syncInterval);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, syncInterval, performFullSync]);

  // Setup realtime subscription
  useEffect(() => {
    if (!enableRealtime || !isOnline) return;

    const channel = supabase
      .channel('background-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mpesa_transactions',
        },
        (payload) => {
          // Update cache with new transaction
          const cached = getCachedData('recent_transactions') || [];
          cacheData('recent_transactions', [payload.new, ...cached.slice(0, 49)]);

          // Notify callback
          if (onNewTransaction) {
            onNewTransaction(payload.new);
          }

          // Show notification for new transactions
          toast.info('New transaction received', {
            description: `${payload.new.transaction_type}: ${payload.new.amount ? `Ksh ${payload.new.amount.toLocaleString()}` : 'Amount pending'}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'review_queue',
        },
        () => {
          // Refresh review queue on any change
          syncReviewQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, isOnline, getCachedData, cacheData, onNewTransaction, syncReviewQueue]);

  return {
    syncDashboardStats,
    syncRecentTransactions,
    syncReviewQueue,
    performFullSync,
    lastSync: lastSyncRef.current,
  };
}
