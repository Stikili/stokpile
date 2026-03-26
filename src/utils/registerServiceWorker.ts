import { toast } from 'sonner';

export function registerServiceWorker() {
  // Only register in production and if service workers are supported
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      console.log('Service Worker registered:', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            toast.info('New version available! Refresh to update.', {
              duration: 10000,
              action: {
                label: 'Refresh',
                onClick: () => window.location.reload(),
              },
            });
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('Service Worker unregistration failed:', error);
      });
  }
}
