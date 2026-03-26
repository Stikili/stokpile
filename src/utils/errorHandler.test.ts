import { describe, it, expect, vi } from 'vitest';
import { ApiError, getUserFriendlyMessage, getErrorMessage } from './errorHandler';

// Mock sonner toast module
vi.mock('sonner@2.0.3', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('ApiError', () => {
  it('should create error with status code', () => {
    const error = new ApiError('Not found', 404);
    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.name).toBe('ApiError');
  });

  it('should create error with optional code', () => {
    const error = new ApiError('Timeout', 408, 'TIMEOUT');
    expect(error.code).toBe('TIMEOUT');
  });

  it('should be an instance of Error', () => {
    const error = new ApiError('test', 500);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});

describe('getUserFriendlyMessage', () => {
  it('should return session expired for 401', () => {
    const error = new ApiError('Unauthorized', 401);
    expect(getUserFriendlyMessage(error)).toContain('session has expired');
  });

  it('should return permission denied for 403', () => {
    const error = new ApiError('Forbidden', 403);
    expect(getUserFriendlyMessage(error)).toContain('permission');
  });

  it('should return not found for 404', () => {
    const error = new ApiError('Not found', 404);
    expect(getUserFriendlyMessage(error)).toContain('not found');
  });

  it('should return conflict message for 409', () => {
    const error = new ApiError('Conflict', 409);
    expect(getUserFriendlyMessage(error)).toContain('conflicts');
  });

  it('should return rate limit message for 429', () => {
    const error = new ApiError('Rate limited', 429);
    expect(getUserFriendlyMessage(error)).toContain('Too many requests');
  });

  it('should return server error for 5xx', () => {
    const error500 = new ApiError('Internal error', 500);
    expect(getUserFriendlyMessage(error500)).toContain('server error');

    const error503 = new ApiError('Service unavailable', 503);
    expect(getUserFriendlyMessage(error503)).toContain('server error');
  });

  it('should return original message for other ApiError status codes', () => {
    const error = new ApiError('Custom error message', 422);
    expect(getUserFriendlyMessage(error)).toBe('Custom error message');
  });

  it('should handle network errors', () => {
    const error = new Error('Failed to fetch');
    expect(getUserFriendlyMessage(error)).toContain('internet connection');
  });

  it('should handle abort errors', () => {
    const error = new DOMException('The operation was aborted.', 'AbortError');
    expect(getUserFriendlyMessage(error)).toContain('timed out');
  });

  it('should return generic message for unknown errors', () => {
    expect(getUserFriendlyMessage(null)).toContain('unexpected error');
    expect(getUserFriendlyMessage(undefined)).toContain('unexpected error');
    expect(getUserFriendlyMessage('string error')).toContain('unexpected error');
  });

  it('should return short error messages directly', () => {
    const error = new Error('Something went wrong');
    expect(getUserFriendlyMessage(error)).toBe('Something went wrong');
  });

  it('should hide long stack-like messages', () => {
    const error = new Error('a'.repeat(250));
    expect(getUserFriendlyMessage(error)).toContain('unexpected error');
  });
});

describe('getErrorMessage', () => {
  it('should extract message from Error', () => {
    expect(getErrorMessage(new Error('test message'))).toBe('test message');
  });

  it('should return fallback for non-Error values', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getErrorMessage('string')).toBe('An unexpected error occurred');
    expect(getErrorMessage(42)).toBe('An unexpected error occurred');
  });
});
