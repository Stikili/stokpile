import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/infrastructure/api';

// VAPID public key — set VITE_VAPID_PUBLIC_KEY in your environment
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationSetup() {
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'default') return;
    if (sessionStorage.getItem('push-asked')) return;

    // Wait 30s before prompting to avoid overwhelming new users
    const timer = setTimeout(() => {
      if (asked) return;
      setAsked(true);
      sessionStorage.setItem('push-asked', '1');
      requestPermission();
    }, 30_000);

    return () => clearTimeout(timer);
  }, [asked]);

  return null;
}

export async function requestPermission() {
  if (!VAPID_PUBLIC_KEY) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const existingSubscription = await reg.pushManager.getSubscription();
    if (existingSubscription) {
      await api.storePushSubscription(existingSubscription.toJSON());
      return;
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await api.storePushSubscription(subscription.toJSON());
    toast.success('Notifications enabled');
  } catch (err) {
    console.warn('Push subscription failed:', err);
  }
}
