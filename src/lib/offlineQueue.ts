// Lightweight offline write queue.
// Stores failed mutations when offline; replays them when back online.

import { toast } from 'sonner';

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  createdAt: string;
  retries: number;
}

const STORAGE_KEY = 'stokpile-offline-queue';
const MAX_RETRIES = 5;

function readQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedRequest[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueueRequest(req: Omit<QueuedRequest, 'id' | 'createdAt' | 'retries'>): void {
  const queue = readQueue();
  queue.push({
    ...req,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retries: 0,
  });
  writeQueue(queue);
  window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: queue.length }));
}

export function getQueueSize(): number {
  return readQueue().length;
}

export function clearQueue(): void {
  writeQueue([]);
  window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: 0 }));
}

let isReplaying = false;

export async function replayQueue(): Promise<{ replayed: number; failed: number }> {
  if (isReplaying) return { replayed: 0, failed: 0 };
  isReplaying = true;

  try {
    const queue = readQueue();
    if (queue.length === 0) return { replayed: 0, failed: 0 };

    const remaining: QueuedRequest[] = [];
    let replayed = 0;
    let failed = 0;

    for (const req of queue) {
      try {
        const res = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body,
        });
        if (res.ok) {
          replayed++;
        } else if (res.status >= 400 && res.status < 500) {
          // Client error — drop the request, don't retry
          failed++;
        } else {
          // Server error — retry later
          if (req.retries < MAX_RETRIES) {
            remaining.push({ ...req, retries: req.retries + 1 });
          } else {
            failed++;
          }
        }
      } catch {
        // Network error — keep in queue
        if (req.retries < MAX_RETRIES) {
          remaining.push({ ...req, retries: req.retries + 1 });
        } else {
          failed++;
        }
      }
    }

    writeQueue(remaining);
    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: remaining.length }));

    if (replayed > 0) {
      toast.success(`Synced ${replayed} offline change${replayed === 1 ? '' : 's'}`);
    }
    if (failed > 0) {
      toast.error(`${failed} offline change${failed === 1 ? '' : 's'} failed to sync`);
    }

    return { replayed, failed };
  } finally {
    isReplaying = false;
  }
}

// Auto-replay when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(() => replayQueue(), 1000);
  });
}
