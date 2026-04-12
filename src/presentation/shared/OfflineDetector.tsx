import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/presentation/ui/alert';
import { WifiOff, Wifi, CloudOff } from 'lucide-react';
import { getQueueSize } from '@/lib/offlineQueue';

export function OfflineDetector() {
  const [_isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOffline, setShowOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
      setQueueSize(getQueueSize());
    };

    const handleQueueChange = (e: Event) => {
      setQueueSize((e as CustomEvent).detail ?? getQueueSize());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueueChange);
    };
  }, []);

  if (!showOffline && !showReconnected && queueSize === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 animate-fade-in">
      {(showOffline || showReconnected) && (
        <Alert variant={showOffline ? 'destructive' : 'default'}>
          {showOffline ? (
            <WifiOff className="h-4 w-4" />
          ) : (
            <Wifi className="h-4 w-4" />
          )}
          <AlertDescription>
            {showOffline
              ? `You are offline.${queueSize > 0 ? ` ${queueSize} change${queueSize === 1 ? '' : 's'} queued.` : ''}`
              : 'Connection restored! Syncing changes...'}
          </AlertDescription>
        </Alert>
      )}
      {!showOffline && !showReconnected && queueSize > 0 && (
        <Alert>
          <CloudOff className="h-4 w-4" />
          <AlertDescription>
            {queueSize} offline change{queueSize === 1 ? '' : 's'} waiting to sync.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
