import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineDetector() {
  const [_isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOffline, setShowOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

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
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOffline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 animate-fade-in">
      <Alert variant={showOffline ? 'destructive' : 'default'}>
        {showOffline ? (
          <WifiOff className="h-4 w-4" />
        ) : (
          <Wifi className="h-4 w-4" />
        )}
        <AlertDescription>
          {showOffline
            ? 'You are offline. Some features may not work.'
            : 'Connection restored!'}
        </AlertDescription>
      </Alert>
    </div>
  );
}
