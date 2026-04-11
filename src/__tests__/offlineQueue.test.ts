import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});

vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });
vi.stubGlobal('window', {
  addEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

const { enqueueRequest, getQueueSize, clearQueue } = await import('@/lib/offlineQueue');

describe('offlineQueue', () => {
  beforeEach(() => {
    clearQueue();
  });

  it('starts with empty queue', () => {
    expect(getQueueSize()).toBe(0);
  });

  it('enqueues a request', () => {
    enqueueRequest({
      url: 'https://api.test.com/data',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"test": true}',
    });
    expect(getQueueSize()).toBe(1);
  });

  it('enqueues multiple requests', () => {
    enqueueRequest({ url: '/a', method: 'POST', headers: {} });
    enqueueRequest({ url: '/b', method: 'PUT', headers: {} });
    expect(getQueueSize()).toBe(2);
  });

  it('clears the queue', () => {
    enqueueRequest({ url: '/a', method: 'POST', headers: {} });
    clearQueue();
    expect(getQueueSize()).toBe(0);
  });
});
