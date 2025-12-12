import { useOfflineMode } from '@/hooks/use-offline';
import { Wifi, WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, syncPendingActions } = useOfflineMode();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50',
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
        'transition-all duration-300',
        isOnline ? 'bg-warning/90 text-warning-foreground' : 'bg-destructive/90 text-destructive-foreground'
      )}
    >
      {isOnline ? (
        <>
          <CloudOff className="h-5 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}
            </p>
            <p className="text-xs opacity-80">Waiting to sync</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={syncPendingActions}
            disabled={isSyncing}
            className="shrink-0"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              'Sync Now'
            )}
          </Button>
        </>
      ) : (
        <>
          <WifiOff className="h-5 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">You're offline</p>
            <p className="text-xs opacity-80">
              {pendingCount > 0
                ? `${pendingCount} changes will sync when online`
                : 'Using cached data'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function ConnectionStatus() {
  const { isOnline, isSyncing } = useOfflineMode();

  return (
    <div className="flex items-center gap-2">
      {isSyncing ? (
        <RefreshCw className="h-4 w-4 text-primary animate-spin" />
      ) : isOnline ? (
        <Wifi className="h-4 w-4 text-status-cleaned" />
      ) : (
        <WifiOff className="h-4 w-4 text-destructive" />
      )}
      <span className="text-xs text-muted-foreground">
        {isSyncing ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
